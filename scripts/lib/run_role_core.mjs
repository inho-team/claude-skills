#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import {
  ensureDirectory,
  getWorkflowMode,
  loadAiTeamConfig,
  validateAiTeamConfig,
  writeJsonFile,
} from './ai_team_config.mjs';
import { getProviderAdapter, listSupportedProviders } from './provider_adapters.mjs';

export function parseRunRoleArgs(argv) {
  const args = { artifacts: [], dryRun: false, execute: false, background: false, worker: false, roleOverrides: {} };
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
    else if (arg === '--background') args.background = true;
    else if (arg === '--worker') args.worker = true;
    else if (arg === '--role-override') {
      const [role, runner] = String(argv[++i] || '').split('=');
      if (!role || !runner) throw new Error('Expected --role-override <role>=<runner>');
      args.roleOverrides[role] = runner;
    }
    else if (arg === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.background) args.execute = true;
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
    '  --background          Launch provider CLI in a detached worker and return immediately',
    '  --role-override k=v   Temporarily map a role to another runner for this execution',
  ].join('\n');
}

export function prepareRoleRun(rawArgs, cwd = process.cwd()) {
  const args = Array.isArray(rawArgs) ? parseRunRoleArgs(rawArgs) : rawArgs;

  if (args.help || !args.role) {
    return {
      help: true,
      message: runRoleUsage(),
    };
  }

  const { path: configPath, config } = loadAiTeamConfig(cwd, args.config);
  const errors = validateAiTeamConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid AI team config: ${configPath}\n- ${errors.join('\n- ')}`);
  }

  const workflowMode = getWorkflowMode(config);
  if (workflowMode === 'single-model') {
    return {
      ok: false,
      help: false,
      workflow_mode: workflowMode,
      config_path: configPath,
      message: 'AI team config mode is single-model; run_role_core dispatch is inactive.',
    };
  }

  const roleConfig = config.roles?.[args.role];
  if (!roleConfig) {
    throw new Error(`Unknown role: ${args.role}`);
  }

  const runnerName = args.roleOverrides?.[args.role] || roleConfig.runner;
  const runnerConfig = config.runners?.[runnerName];
  if (!runnerConfig) {
    throw new Error(`Role ${args.role} references missing runner: ${runnerName}`);
  }

  const adapter = getProviderAdapter(runnerConfig.provider);
  const inputText = loadInputText(cwd, args.input);
  const artifacts = resolveArtifacts(cwd, args.artifacts);
  const runId = args.runId || randomUUID().slice(0, 8);
  const runDir = join(cwd, '.qe', 'ai-team', 'runs', runId);
  ensureDirectory(runDir);

  const invocation = adapter({
    role: args.role,
    runnerName,
    roleConfig,
    runnerConfig,
    inputText,
    artifacts,
  });

  const promptPath = join(runDir, `${args.role}-prompt.md`);
  writeFileSync(promptPath, `${invocation.prompt}\n`, 'utf8');

  const ledgerPath = join(runDir, 'run.json');
  const outputPath = join(runDir, `${args.role}-output.md`);
  const configuredTimeoutMs = args.timeoutMs ?? runnerConfig.timeout_ms ?? config.providers?.[runnerConfig.provider]?.timeout_ms ?? 120000;
  const execution = {
    requested: args.execute,
    attempted: false,
    // Background workers should wait for provider exit rather than an arbitrary timeout.
    // 백그라운드 워커는 임의 타임아웃 대신 provider 종료 신호를 기다린다.
    timeout_ms: args.worker ? 0 : configuredTimeoutMs,
    command: null,
    exit_code: null,
    stdout_path: null,
    stderr_path: null,
    error: null,
  };

  const command = args.execute
    ? resolveConfiguredInvocation({
        provider: runnerConfig.provider,
        config,
        runnerConfig,
        cwd,
        outputFile: outputPath,
        defaultInvocation: invocation,
      })
    : null;

  return {
    ok: true,
    args,
    cwd,
    configPath,
    config,
    workflowMode,
    roleConfig,
    roleOverrides: args.roleOverrides,
    runnerName,
    runnerConfig,
    inputText,
    artifacts,
    runId,
    runDir,
    invocation,
    promptPath,
    ledgerPath,
    outputPath,
    execution,
    command,
  };
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

function installationHint(provider, executable) {
  const commandName = executable || provider;
  const hints = {
    claude: `Install or expose Claude CLI on PATH, then verify with \`${commandName} --help\`.`,
    codex: `Install or expose Codex CLI on PATH, then verify with \`${commandName} --help\`.`,
    gemini: `Install or expose Gemini CLI on PATH, then verify with \`${commandName} --help\`.`,
    gpt: `Install or expose the OpenAI CLI on PATH, then verify with \`${commandName} --help\`.`,
  };
  return hints[provider] || `Install or expose \`${commandName}\` on PATH, then verify it runs from the terminal.`;
}

function formatExecutionError({ provider, command, result }) {
  if (!result?.error) return null;

  const executable = command?.executable || provider;
  const installMessage = installationHint(provider, executable);

  if (result.error.code === 'ENOENT') {
    return `Executable not found: ${executable}. ${installMessage}`;
  }

  if (result.error.code === 'ETIMEDOUT') {
    return `Execution timed out for ${executable}. Increase timeout_ms or verify the CLI can complete in batch mode.`;
  }

  return `${result.error.message} ${installMessage}`;
}

function resolveConfiguredInvocation({ provider, config, runnerConfig, cwd, outputFile, defaultInvocation }) {
  const override = runnerConfig.command || config.providers?.[provider]?.command;
  if (override) {
    if (!override.executable || !Array.isArray(override.args)) {
      throw new Error(`Invalid command override for provider ${provider}. Expected { executable, args[] }.`);
    }
    return {
      executable: override.executable,
      args: interpolateArgs(override.args, {
        cwd,
        model: runnerConfig.model,
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
      model: runnerConfig.model,
      outputFile,
      prompt: defaultInvocation.prompt,
      systemPrompt: defaultInvocation.system_prompt,
    }),
  };
}

export function runRoleCommand(rawArgs, cwd = process.cwd()) {
  const prepared = prepareRoleRun(rawArgs, cwd);
  if (prepared.help || prepared.ok === false) {
    return prepared;
  }

  const {
    args,
    configPath,
    roleConfig,
    runnerName,
    runnerConfig,
    workflowMode,
    runDir,
    promptPath,
    ledgerPath,
    outputPath,
    invocation,
    artifacts,
    runId,
    execution,
    command,
  } = prepared;

  if (args.execute) {
    if (!command) {
      execution.error = `No executable command is configured for runner ${runnerName} (${runnerConfig.provider}).`;
    } else {
      // Foreground execution is still synchronous; background mode is handled by scripts/run_role.mjs.
      // 포그라운드 실행은 여기서 동기 처리하고, 백그라운드 제어는 run_role.mjs가 맡는다.
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
        execution.error = formatExecutionError({
          provider: runnerConfig.provider,
          command,
          result,
        });
      } else if (result.status !== 0) {
        const stderrText = (result.stderr || '').trim();
        const stdoutText = (result.stdout || '').trim();
        execution.error = stderrText || stdoutText || `Runner exited with code ${result.status}`;
      }
    }
  }

  const result = {
    run_id: runId,
    role: args.role,
    runner: runnerName,
    provider: runnerConfig.provider,
    model: runnerConfig.model,
    workflow_mode: workflowMode,
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
    runner: runnerName,
    provider: runnerConfig.provider,
    model: runnerConfig.model,
    workflow_mode: workflowMode,
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
