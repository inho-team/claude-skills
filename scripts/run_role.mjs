#!/usr/bin/env node

import { createWriteStream, existsSync, openSync, readFileSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { writeJsonFile } from './lib/ai_team_config.mjs';
import { parseRunRoleArgs, prepareRoleRun, runRoleCommand, runRoleUsage } from './lib/run_role_core.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);

function buildWorkerArgs(args, runId) {
  const nextArgs = [SCRIPT_PATH, '--role', args.role, '--run-id', runId, '--execute', '--worker'];

  if (args.input) nextArgs.push('--input', args.input);
  if (args.config) nextArgs.push('--config', args.config);
  if (Number.isFinite(args.timeoutMs)) nextArgs.push('--timeout-ms', String(args.timeoutMs));
  for (const artifact of args.artifacts || []) {
    nextArgs.push('--artifact', artifact);
  }

  return nextArgs;
}

function updateBackgroundStatus(path, next) {
  const previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  writeJsonFile(path, {
    ...previous,
    ...next,
    updated_at: new Date().toISOString(),
  });
}

function startBackgroundWorker(args) {
  const prepared = runRoleCommand({ ...args, execute: false, dryRun: true }, process.cwd());
  const runDir = dirname(prepared.prompt_path);
  const liveLogPath = join(runDir, `${args.role}-live.log`);
  const backgroundPath = join(runDir, 'background.json');
  const logFd = openSync(liveLogPath, 'a');

  const child = spawn(process.execPath, buildWorkerArgs(args, prepared.run_id), {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', logFd, logFd],
    windowsHide: true,
  });

  child.unref();

  const backgroundInfo = {
    run_id: prepared.run_id,
    role: args.role,
    pid: child.pid,
    live_log_path: liveLogPath,
    // The detached worker will flip this to running/succeeded/failed later.
    // 실제 워커가 이어서 running/succeeded/failed 로 상태를 전이한다.
    status: 'starting',
    follow_command: `Get-Content -Wait "${liveLogPath}"`,
    started_at: new Date().toISOString(),
  };

  writeJsonFile(backgroundPath, backgroundInfo);

  return {
    ...prepared,
    execution_attempted: false,
    execution_error: null,
    background_started: true,
    background: backgroundInfo,
  };
}

function isFatalChunk(text) {
  if (!text) return false;
  const fatalPatterns = [
    /(^|\s)error:/i,
    /authentication failed/i,
    /invalid api key/i,
    /not recognized as an internal or external command/i,
    /executable not found/i,
    /\benoent\b/i,
    /missing api key/i,
    /permission denied/i,
  ];
  return fatalPatterns.some((pattern) => pattern.test(text));
}

function detectBlockReason(text) {
  if (!text) return null;
  const normalized = text.toLowerCase();
  const quotaPatterns = [
    'quota',
    'rate limit',
    'billing',
    'subscription',
    'usage limit',
    'insufficient credits',
    'payment required',
    'too many requests',
    'temporarily unavailable',
  ];

  if (quotaPatterns.some((pattern) => normalized.includes(pattern))) {
    // Quota-like failures need operator intervention or a temporary role reassignment.
    // 구독/할당량 계열 실패는 사용자 확인 후 role 재배정 후보를 보여줘야 한다.
    return 'blocked_quota';
  }

  return null;
}

function runWorker(args) {
  const prepared = prepareRoleRun(args, process.cwd());
  if (prepared.help || prepared.ok === false) {
    return prepared;
  }

  const {
    runId,
    roleConfig,
    runnerName,
    runnerConfig,
    workflowMode,
    promptPath,
    ledgerPath,
    outputPath,
    configPath,
    invocation,
    artifacts,
    roleConfig: roleDefinition,
    args: parsedArgs,
    command,
    execution,
    cwd,
  } = prepared;

  const runDir = dirname(promptPath);
  const stdoutPath = join(runDir, `${parsedArgs.role}-stdout.log`);
  const stderrPath = join(runDir, `${parsedArgs.role}-stderr.log`);
  const liveLogPath = join(runDir, `${parsedArgs.role}-live.log`);
  const backgroundPath = join(runDir, 'background.json');

  if (!command) {
    execution.error = `No executable command is configured for runner ${runnerName} (${runnerConfig.provider}).`;
    execution.exit_code = 1;
    writeJsonFile(ledgerPath, {
      run_id: runId,
      created_at: new Date().toISOString(),
      config_path: configPath,
      role: parsedArgs.role,
      runner: runnerName,
      provider: runnerConfig.provider,
      model: runnerConfig.model,
      workflow_mode: workflowMode,
      responsibility: roleDefinition.responsibility,
      input_path: parsedArgs.input || null,
      artifact_paths: artifacts,
      execution,
      status: 'execution_failed',
      prompt_path: promptPath,
      output_path: outputPath,
      dry_run: parsedArgs.dryRun,
    });
    updateBackgroundStatus(backgroundPath, {
      run_id: runId,
      role: parsedArgs.role,
      status: 'failed',
      error: execution.error,
      live_log_path: liveLogPath,
      stdout_path: stdoutPath,
      stderr_path: stderrPath,
      output_path: outputPath,
    });
    return {
      run_id: runId,
      role: parsedArgs.role,
      runner: runnerName,
      provider: runnerConfig.provider,
      model: runnerConfig.model,
      workflow_mode: workflowMode,
      prompt_path: promptPath,
      run_ledger_path: ledgerPath,
      output_path: outputPath,
      execution_attempted: false,
      execution_error: execution.error,
      background_started: false,
    };
  }

  const stdoutStream = createWriteStream(stdoutPath, { flags: 'a' });
  const stderrStream = createWriteStream(stderrPath, { flags: 'a' });
  const liveLogStream = createWriteStream(liveLogPath, { flags: 'a' });

  const child = spawn(command.executable, command.args, {
    cwd,
    stdio: 'pipe',
    windowsHide: true,
  });

  execution.attempted = true;
  execution.command = command;
  execution.stdout_path = stdoutPath;
  execution.stderr_path = stderrPath;

  updateBackgroundStatus(backgroundPath, {
    run_id: runId,
    role: parsedArgs.role,
    pid: child.pid,
    // The worker is now live and producing observable state through files only,
    // which avoids streaming provider chatter into the main Claude context.
    // 메인 Claude context 오염을 피하기 위해 상태와 로그를 파일로만 노출한다.
    status: 'running',
    last_output_at: null,
    live_log_path: liveLogPath,
    stdout_path: stdoutPath,
    stderr_path: stderrPath,
    output_path: outputPath,
  });

  child.stdin.end(invocation.prompt);

  let fatalReason = null;
  let blockReason = null;
  let outputCaptured = '';

  const onChunk = (kind, chunk) => {
    const text = chunk.toString();
    if (kind === 'stdout') {
      outputCaptured += text;
      stdoutStream.write(text);
    } else {
      stderrStream.write(text);
    }
    liveLogStream.write(`[${new Date().toISOString()}] ${kind}: ${text}`);
    updateBackgroundStatus(backgroundPath, {
      status: 'running',
      last_output_at: new Date().toISOString(),
    });

    if (!fatalReason && isFatalChunk(text)) {
      // Stop early on known-fatal provider output to avoid indefinite waits.
      // 알려진 치명 출력이 보이면 즉시 중단해 무한 대기를 막는다.
      fatalReason = text.trim().slice(0, 500);
      blockReason = detectBlockReason(text);
      updateBackgroundStatus(backgroundPath, {
        status: blockReason || 'failed',
        fatal_reason: fatalReason,
        block_reason: blockReason,
      });
      child.kill();
    }
  };

  child.stdout.on('data', (chunk) => onChunk('stdout', chunk));
  child.stderr.on('data', (chunk) => onChunk('stderr', chunk));

  return new Promise((resolve, reject) => {
    child.on('error', (error) => {
      execution.error = error.message;
      execution.exit_code = 1;
      updateBackgroundStatus(backgroundPath, {
        status: 'failed',
        error: execution.error,
      });
      reject(error);
    });

    child.on('close', (code, signal) => {
      execution.exit_code = code;
      if (fatalReason && !execution.error) {
        execution.error = `Fatal runner output detected: ${fatalReason}`;
      } else if (signal && !execution.error) {
        execution.error = `Runner terminated by signal: ${signal}`;
      } else if (code !== 0 && !execution.error) {
        execution.error = `Runner exited with code ${code}`;
      }

      if ((!existsSync(outputPath) || readFileSync(outputPath, 'utf8').length === 0) && outputCaptured) {
        writeFileSync(outputPath, outputCaptured, 'utf8');
      }

      writeJsonFile(ledgerPath, {
        run_id: runId,
        created_at: new Date().toISOString(),
        config_path: configPath,
        role: parsedArgs.role,
        runner: runnerName,
        provider: runnerConfig.provider,
        model: runnerConfig.model,
        workflow_mode: workflowMode,
        responsibility: roleDefinition.responsibility,
        input_path: parsedArgs.input || null,
        artifact_paths: artifacts,
        execution,
        status: execution.error ? 'execution_failed' : 'executed',
        prompt_path: promptPath,
        output_path: outputPath,
        dry_run: parsedArgs.dryRun,
      });

      updateBackgroundStatus(backgroundPath, {
        // The final background state is the contract consumed by higher-level workflow polling.
        // 상위 워크플로는 이 최종 상태값을 읽어 다음 단계 진행 여부를 결정한다.
        status: execution.error ? (blockReason || 'failed') : 'succeeded',
        error: execution.error,
        block_reason: blockReason,
        exit_code: code,
        signal,
        completed_at: new Date().toISOString(),
      });

      stdoutStream.end();
      stderrStream.end();
      liveLogStream.end();

      resolve({
        run_id: runId,
        role: parsedArgs.role,
        runner: runnerName,
        provider: runnerConfig.provider,
        model: runnerConfig.model,
        workflow_mode: workflowMode,
        prompt_path: promptPath,
        run_ledger_path: ledgerPath,
        output_path: outputPath,
        execution_attempted: true,
        execution_error: execution.error,
      });
    });
  });
}

const args = parseRunRoleArgs(process.argv.slice(2));

if (args.help || !args.role) {
  console.log(runRoleUsage());
  process.exit(1);
}

const result = args.background && !args.worker
  ? startBackgroundWorker(args)
  : args.worker
    ? await runWorker(args)
    : runRoleCommand(args, process.cwd());

if (result.help) {
  console.log(runRoleUsage());
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
