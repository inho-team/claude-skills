#!/usr/bin/env node
// Adapted from oh-my-claudecode (MIT, © 2025 Yeachan Heo).
// See https://github.com/Yeachan-Heo/oh-my-claudecode for original.
'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
import { recordFailure } from './lib/retry-counter.mjs';

const FAILURE_THRESHOLD = 5;

// Read stdin payload
let input = '';
try {
  input = readFileSync('/dev/stdin', 'utf8');
} catch {
  process.exit(0);
}

let data;
try {
  data = JSON.parse(input);
} catch {
  process.exit(0);
}

// Determine command signature
const toolName = data.tool_name || data.toolName || '';
const toolInput = data.tool_input || data.toolInput || {};

let signature;
if (toolName === 'Bash' && toolInput.command) {
  // Trim to first 120 chars to avoid overly unique keys across minor variations
  signature = toolInput.command.trim().slice(0, 120);
} else {
  signature = `${toolName}:${toolInput.file_path || toolInput.filePath || ''}`;
}

// Only act on failures
const isFailure =
  data.tool_response?.includes?.('error') ||
  data.tool_response?.includes?.('Error') ||
  data.tool_response?.includes?.('FAILED') ||
  (data.exit_code !== undefined && data.exit_code !== 0);

if (!isFailure) {
  process.exit(0);
}

// Resolve state directory
const cwd = data.cwd || process.cwd();
const stateDir = process.env.QE_STATE_DIR || join(cwd, '.qe', 'state');

let count = 0;
try {
  const result = recordFailure(signature, stateDir);
  count = result.count;
} catch {
  process.exit(0);
}

if (count >= FAILURE_THRESHOLD) {
  const displaySig = signature.length > 80 ? signature.slice(0, 80) + '…' : signature;
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUseFailure',
      additionalContext: `⚠️ ALTERNATIVE APPROACH NEEDED: command "${displaySig}" failed ${count} times. Stop retrying the same command — diagnose root cause or try a different approach.`,
    },
  }));
}

// Else exit silently
