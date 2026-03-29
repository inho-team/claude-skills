#!/usr/bin/env node

import { existsSync } from 'fs';
import {
  defaultRegistry,
  getClientConfigPaths,
  getDefaultRegistryPath,
  readRegistry,
  syncRegistryToClients,
  writeRegistry,
} from './lib/qe_mcp_registry.mjs';

function printUsage() {
  console.log(`Usage:
  node scripts/qe_mcp.mjs init-registry [--registry path] [--force]
  node scripts/qe_mcp.mjs doctor [--registry path] [--json]
  node scripts/qe_mcp.mjs sync [--registry path] [--client claude|codex|gemini|all] [--dry-run]

Notes:
  - The registry is global by default: ~/.qe/mcp/registry.json
  - sync writes client-specific MCP configuration files
  - when envSecrets are configured, QE wraps the server launch through qe_secret_launch.mjs`);
}

function parseArgs(argv) {
  const options = {
    registry: getDefaultRegistryPath(),
    force: false,
    json: false,
    dryRun: false,
    client: 'all',
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--registry') {
      options.registry = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--client') {
      options.client = argv[index + 1] || options.client;
      index += 1;
      continue;
    }
    if (token === '--force') {
      options.force = true;
      continue;
    }
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    positionals.push(token);
  }

  return { options, positionals };
}

function normalizeClients(client) {
  return client === 'all' ? ['claude', 'codex', 'gemini'] : [client];
}

async function main() {
  const { options, positionals } = parseArgs(process.argv.slice(2));
  const command = positionals[0];

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  if (command === 'init-registry') {
    if (existsSync(options.registry) && !options.force) {
      throw new Error(`Registry already exists: ${options.registry}. Use --force to overwrite.`);
    }
    writeRegistry(options.registry, defaultRegistry());
    console.log(`Initialized QE MCP registry: ${options.registry}`);
    return;
  }

  if (command === 'doctor') {
    const registry = readRegistry(options.registry);
    const report = {
      registry_path: options.registry,
      registry_exists: existsSync(options.registry),
      servers: Object.keys(registry.servers || {}),
      client_paths: getClientConfigPaths(),
    };
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    console.log(`Registry: ${report.registry_path}`);
    console.log(`Exists: ${report.registry_exists}`);
    console.log(`Servers: ${report.servers.join(', ') || 'none'}`);
    for (const [name, value] of Object.entries(report.client_paths)) {
      console.log(`${name}: ${value}`);
    }
    return;
  }

  if (command === 'sync') {
    const result = syncRegistryToClients({
      registryPath: options.registry,
      clients: normalizeClients(options.client),
      dryRun: options.dryRun,
    });
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    for (const item of result.clients) {
      console.log(`${item.dry_run ? 'Would sync' : 'Synced'} ${item.client} -> ${item.path}`);
    }
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
