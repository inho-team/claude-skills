#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { ensureDirectory, loadAiTeamConfig, validateAiTeamConfig, writeJsonFile } from './ai_team_config.mjs';
import { getProviderAdapter, listSupportedProviders } from './provider_adapters.mjs';

export function parseRunRoleArgs(argv) {
  const args = { artifacts: [], dryRun: false, execute: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--role') args.role = argv[++i];
    else if (arg === '--input') args.input = argv[++i];
    else if (arg === '--artifact') args.artifacts.push(argv[++i]);
    else if (arg === '--config') args.config = argv[++i];
    else if (arg === '--run-id') args.runId = argv[++i];
    else if (arg === '--timeout-ms') args.timeoutMs = Number(argv[++i]);
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--execute') args.execute = true;
    else if (arg === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

export function runRoleUsage() {
  return [
    'Usage:',
    '  node scripts/run_role.mjs --role <planner|implementer|reviewer|supervisor> [options]',
    '',
    'Options:',
    '  --input <path>        Path to a text/markdown/json input file',
    '  --artifact <path>     Additional artifact path to include (repeatable)',
    '  --config <path>       Override config path',
    '  --run-id <id>         Override generated run id',
    '  --timeout-ms <ms>     Execution timeout for provider CLI',
    '  --dry-run             Do not attempt execution; emit the prompt bundle + ledger only',
    '  --execute             Attempt provider CLI execution',
  ].join('\n');
}

function loadInputText(cwd, inputPath) {
  if (!inputPath) return 'No explicit input file provided.';
  const resolved = resolve(cwd, inputPath);
  if (!existsSync(resolved)) {
    throw new Error(`Input file not found: ${resolved}`);
  }
  return readFileSync(resolved, 'utf8');
}

function resolveArtifacts(cwd, artifacts) {
  return artifacts.map(path => resolve(cwd, path));
}

function interpolateArgs(args, values) {
  return args.map(arg => arg
    .replaceAll('{cwd}', values.cwd)
    .replaceAll('{model}', values.model)
    .replaceAll('{output_file}', values.outputFile)
    .replaceAll('{prompt}', values.prompt)
    .replaceAll('{system_prompt}', values.systemPrompt || ''));
}

function needsCmdShim(executable) {
  return /\.cmd$|\.bat$/i.test(executable);
}

function executeInvocation(command, prompt, cwd, timeoutMs) {
  const executable = needsCmdShim(command.executable) ? 'cmd.exe' : command.executable;
  const args = needsCmdShim(command.executable)
    ? ['/d', '/s', '/c', command.executable, ...command.args]
    : command.args;

  return spawnSync(executable, args, {
    cwd,
    input: prompt,
    encoding: 'utf8',
    timeout: timeoutMs,
    windowsHide: true,
  });
}

function resolveConfiguredInvocation({ provider, config, roleConfig, cwd, outputFile, defaultInvocation }) {
  const override = config.providers?.[provider]?.command;
  if (override) {
    if (!override.executable || !Array.isArray(override.args)) {
      throw new Error(`Invalid command override for provider ${provider}. Expected { executable, args[] }.`);
    }
    return {
      executable: override.executable,
      args: interpolateArgs(override.args, {
        cwd,
        model: roleConfig.model,
        outputFile,
        prompt: defaultInvocation.prompt,
        systemPrompt: defaultInvocation.system_prompt,
      }),
    };
  }

  if (!defaultInvocation?.suggested_cli) {
    return null;
  }

  return {
    executable: defaultInvocation.suggested_cli.executable,
    args: interpolateArgs(defaultInvocation.suggested_cli.args || [], {
      cwd,
      model: roleConfig.model,
      outputFile,
      prompt: defaultInvocation.prompt,
      systemPrompt: defaultInvocation.system_prompt,
    }),
  };
}

export function runRoleCommand(rawArgs, cwd = process.cwd()) {
  const args = Array.isArray(rawArgs) ? parseRunRoleArgs(rawArgs) : rawArgs;

  if (args.help || !args.role) {
    return {
      ok: false,
      help: true,
      message: runRoleUsage(),
    };
  }

  const { path: configPath, config } = loadAiTeamConfig(cwd, args.config);
  const errors = validateAiTeamConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid AI team config: ${configPath}\n- ${errors.join('\n- ')}`);
  }

  const roleConfig = config.roles?.[args.role];
  if (!roleConfig) {
    throw new Error(`Unknown role: ${args.role}`);
  }

  const adapter = getProviderAdapter(roleConfig.provider);
  const inputText = loadInputText(cwd, args.input);
  const artifacts = resolveArtifacts(cwd, args.artifacts);
  const runId = args.runId || randomUUID().slice(0, 8);
  const runDir = join(cwd, '.qe', 'ai-team', 'runs', runId);
  ensureDirectory(runDir);

  const invocation = adapter({
    role: args.role,
    roleConfig,
    inputText,
    artifacts,
  });

  const promptPath = join(runDir, `${args.role}-prompt.md`);
  writeFileSync(promptPath, `${invocation.prompt}\n`, 'utf8');

  const ledgerPath = join(runDir, 'run.json');
  const outputPath = join(runDir, `${args.role}-output.md`);
  const execution = {
    requested: args.execute,
    attempted: false,
    timeout_ms: args.timeoutMs ?? config.providers?.[roleConfig.provider]?.timeout_ms ?? 120000,
    command: null,
    exit_code: null,
    stdout_path: null,
    stderr_path: null,
    error: null,
  };

  if (args.execute) {
    const command = resolveConfiguredInvocation({
      provider: roleConfig.provider,
      config,
      roleConfig,
      cwd,
      outputFile: outputPath,
      defaultInvocation: invocation,
    });

    if (!command) {
      execution.error = `No executable command is configured for provider ${roleConfig.provider}.`;
    } else {
      execution.attempted = true;
      execution.command = command;
      const result = executeInvocation(command, invocation.prompt, cwd, execution.timeout_ms);

      const stdoutPath = join(runDir, `${args.role}-stdout.log`);
      const stderrPath = join(runDir, `${args.role}-stderr.log`);
      writeFileSync(stdoutPath, result.stdout || '', 'utf8');
      writeFileSync(stderrPath, result.stderr || '', 'utf8');

      if ((!existsSync(outputPath) || readFileSync(outputPath, 'utf8').length === 0) && result.stdout) {
        writeFileSync(outputPath, result.stdout, 'utf8');
      }

      execution.exit_code = result.status;
      execution.stdout_path = stdoutPath;
      execution.stderr_path = stderrPath;
      if (result.error) {
        execution.error = result.error.message;
      }
    }
  }

  const result = {
    run_id: runId,
    role: args.role,
    provider: roleConfig.provider,
    model: roleConfig.model,
    prompt_path: promptPath,
    run_ledger_path: ledgerPath,
    output_path: outputPath,
    execution_attempted: execution.attempted,
    execution_error: execution.error,
    dry_run: args.dryRun,
  };

  writeJsonFile(ledgerPath, {
    run_id: runId,
    created_at: new Date().toISOString(),
    config_path: configPath,
    role: args.role,
    provider: roleConfig.provider,
    model: roleConfig.model,
    responsibility: roleConfig.responsibility,
    input_path: args.input ? resolve(cwd, args.input) : null,
    artifact_paths: artifacts,
    supported_providers: listSupportedProviders(),
    invocation,
    status: execution.requested
      ? (execution.error?.includes('ETIMEDOUT') ? 'execution_timed_out' : execution.exit_code === 0 ? 'executed' : 'execution_failed')
      : 'prepared',
    prompt_path: promptPath,
    output_path: outputPath,
    dry_run: args.dryRun,
    execution,
  });

  return result;
}
