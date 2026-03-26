#!/usr/bin/env node

import { loadAiTeamConfig, validateAiTeamConfig } from './lib/ai_team_config.mjs';

const fileArg = process.argv[2] || '.qe/ai-team/config/team-config.json';
const { path, config } = loadAiTeamConfig(process.cwd(), fileArg);
const errors = validateAiTeamConfig(config);

if (errors.length > 0) {
  console.error(`AI team config validation failed for ${path}`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`AI team config is valid: ${path}`);
