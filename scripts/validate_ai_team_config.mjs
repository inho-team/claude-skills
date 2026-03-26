#!/usr/bin/env node

import {
  getTeamConfigSchemaPath,
  loadAiTeamConfig,
  validateAiTeamConfig,
} from './lib/ai_team_config.mjs';

function parseArgs(argv) {
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--schema') {
      if (i + 1 >= argv.length) {
        throw new Error('Missing value for --schema');
      }
      args.schema = argv[++i];
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else if (token.startsWith('-')) {
      throw new Error(`Unknown argument: ${token}`);
    } else {
      args.positional.push(token);
    }
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/validate_ai_team_config.mjs [configPath] [--schema <path>]',
    '',
    'Arguments:',
    '  configPath          Optional path to the team config (default .qe/ai-team/config/team-config.json)',
    '  --schema <path>     Optional override schema path (defaults to core/schemas/team-config.schema.json)',
  ].join('\n');
}

function main() {
  const cwd = process.cwd();
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.log('');
    console.log(usage());
    process.exit(1);
  }

  if (parsed.help) {
    console.log(usage());
    process.exit(0);
  }

  const configArg = parsed.positional[0] || '.qe/ai-team/config/team-config.json';
  const schemaPath =
    parsed.schema !== undefined ? getTeamConfigSchemaPath(cwd, parsed.schema) : undefined;

  try {
    const { path, config } = loadAiTeamConfig(cwd, configArg);
    const errors = validateAiTeamConfig(config, { schemaPath });

    if (errors.length > 0) {
      console.error(`AI team config validation failed for ${path}`);
      for (const error of errors) {
        console.error(`- ${error}`);
      }
      process.exit(1);
    }

    console.log(`AI team config is valid: ${path}`);
  } catch (error) {
    console.error(`Validation error: ${error.message}`);
    process.exit(1);
  }
}

main();
