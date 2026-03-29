#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolveSecretBindings } from './lib/qe_secrets.mjs';

function printUsage() {
  console.log(`Usage:
  node scripts/qe_secret_launch.mjs [--env-secret ENV_NAME=secret-name]... [--cwd path] -- <command> [args...]

Notes:
  - Resolves secret bindings through QE secret storage.
  - Injects values into the child environment without printing them.
  - Intended for wrappers such as MCP server launches.`);
}

function parseArgs(argv) {
  const bindings = [];
  let cwd = process.cwd();
  let command = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help' || token === '-h') {
      return { help: true };
    }

    if (token === '--cwd') {
      cwd = argv[index + 1] || cwd;
      index += 1;
      continue;
    }

    if (token === '--env-secret') {
      bindings.push(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === '--') {
      command = argv.slice(index + 1);
      break;
    }
  }

  return { help: false, cwd, bindings, command };
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help || parsed.command.length === 0) {
    printUsage();
    return;
  }

  const resolved = resolveSecretBindings({
    cwd: parsed.cwd,
    bindings: parsed.bindings,
  });

  const env = { ...process.env };
  for (const item of resolved) {
    env[item.envName] = item.value;
  }

  const [command, ...args] = parsed.command;
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: parsed.cwd,
      env,
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
    });

    child.on('error', rejectPromise);
    child.on('exit', (code, signal) => {
      if (signal) {
        process.exitCode = 1;
      } else {
        process.exitCode = code ?? 1;
      }
      resolvePromise();
    });
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
