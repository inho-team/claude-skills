#!/usr/bin/env node

import { parseRunRoleArgs, runRoleCommand, runRoleUsage } from './lib/run_role_core.mjs';

const args = parseRunRoleArgs(process.argv.slice(2));
const result = runRoleCommand(args, process.cwd());

if (result.help) {
  console.log(runRoleUsage());
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
