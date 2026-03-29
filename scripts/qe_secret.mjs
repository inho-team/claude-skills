#!/usr/bin/env node

import {
  deleteSecret,
  describeRegistryLocations,
  executeWithSecrets,
  getSecretDoctorReport,
  getSecretPromptLabel,
  listSecrets,
  promptHiddenValue,
  readMultilineFriendlyValueFromStdin,
  saveSecretRegistryTemplate,
  setSecret,
} from './lib/qe_secrets.mjs';

function printUsage() {
  console.log(`Usage:
  node scripts/qe_secret.mjs doctor [--json]
  node scripts/qe_secret.mjs list [--scope project|global|all] [--json]
  node scripts/qe_secret.mjs set <name> [--scope project|global] [--env ENV_NAME] [--backend auto|dpapi-file|keychain|libsecret] [--stdin] [--note "text"]
  node scripts/qe_secret.mjs delete <name> [--scope project|global|all]
  node scripts/qe_secret.mjs exec [--env-secret ENV_NAME=secret-name]... -- <command> [args...]

Notes:
  - Secret values are never written to the project registry.
  - "exec" resolves secrets into the child process environment without printing them.
  - Direct reveal is intentionally unsupported through this CLI.`);
}

function parseOptions(argv) {
  const positionals = [];
  const options = {
    scope: undefined,
    envName: undefined,
    backend: 'auto',
    stdin: false,
    json: false,
    note: '',
    bindings: [],
    command: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--') {
      options.command = argv.slice(index + 1);
      break;
    }

    if (token === '--scope') {
      options.scope = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === '--env') {
      options.envName = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === '--backend') {
      options.backend = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === '--note') {
      options.note = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (token === '--env-secret') {
      options.bindings.push(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === '--stdin') {
      options.stdin = true;
      continue;
    }

    if (token === '--json') {
      options.json = true;
      continue;
    }

    positionals.push(token);
  }

  return { positionals, options };
}

function printList(items, jsonMode) {
  if (jsonMode) {
    console.log(JSON.stringify({ secrets: items }, null, 2));
    return;
  }

  if (items.length === 0) {
    console.log('No secrets are registered.');
    return;
  }

  for (const item of items) {
    console.log(`${item.scope}\t${item.name}\t${item.env_name}\t${item.backend}`);
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const cwd = process.cwd();
  const { positionals, options } = parseOptions(rest);

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  if (command === 'doctor') {
    const report = {
      ...getSecretDoctorReport(),
      ...describeRegistryLocations(cwd),
    };

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(`Platform: ${report.platform}`);
    console.log(`Recommended backend: ${report.recommended_backend}`);
    console.log(`Available backends: ${report.available_backends.join(', ') || 'none'}`);
    console.log(`Project registry: ${report.project_registry_path}`);
    console.log(`Global registry: ${report.global_registry_path}`);
    for (const note of report.notes) {
      console.log(`- ${note}`);
    }
    return;
  }

  if (command === 'list') {
    printList(listSecrets({ cwd, scope: options.scope || 'all' }), options.json);
    return;
  }

  if (command === 'set') {
    const name = positionals[0];
    if (!name) {
      throw new Error('Secret name is required for "set".');
    }

    const scope = options.scope || 'project';
    const value = options.stdin
      ? await readMultilineFriendlyValueFromStdin()
      : await promptHiddenValue(getSecretPromptLabel({ name, scope }));

    if (!value) {
      throw new Error('Secret value is empty.');
    }

    const locations = describeRegistryLocations(cwd);
    saveSecretRegistryTemplate(
      scope === 'global' ? locations.global_registry_path : locations.project_registry_path
    );

    const result = setSecret({
      cwd,
      name,
      scope,
      envName: options.envName,
      backend: options.backend,
      value,
      note: options.note,
    });

    console.log(
      `${result.overwritten ? 'Updated' : 'Stored'} secret ${result.name} (${result.scope}) -> ${result.env_name} via ${result.backend}`
    );
    console.log(`Registry: ${result.registry_path}`);
    return;
  }

  if (command === 'delete') {
    const name = positionals[0];
    if (!name) {
      throw new Error('Secret name is required for "delete".');
    }

    const result = deleteSecret({
      cwd,
      name,
      scope: options.scope || 'project',
    });

    for (const item of result) {
      console.log(`Deleted ${name} from ${item.scope} (${item.backend})`);
    }
    return;
  }

  if (command === 'exec') {
    if (options.bindings.length === 0) {
      throw new Error('At least one --env-secret binding is required for "exec".');
    }

    if (options.command.length === 0) {
      throw new Error('A child command is required after "--".');
    }

    const [childCommand, ...childArgs] = options.command;
    const result = await executeWithSecrets({
      cwd,
      bindings: options.bindings,
      command: childCommand,
      args: childArgs,
    });

    if (result.signal) {
      console.error(`Child process terminated by signal ${result.signal}.`);
      process.exitCode = 1;
      return;
    }

    process.exitCode = result.code;
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
