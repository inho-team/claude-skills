// Adapted from oh-my-claudecode (MIT, © 2025 Yeachan Heo).
// See https://github.com/Yeachan-Heo/oh-my-claudecode for original.
#!/usr/bin/env node
'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
import { estimateUsageRatio, recordBlock, resetBlocks, getBlockCount } from './lib/context-meter.mjs';

const MAX_BLOCKS = 2;
const WARN_RATIO = 0.75;
const CRITICAL_RATIO = 0.95;
const RESET_RATIO = 0.5;

// Reasons that must never be blocked (deadlock prevention)
const SAFE_PASSTHROUGH_REASONS = new Set(['context_limit', 'user_abort']);

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

// Deadlock prevention: never block on these conditions
if (data.stop_hook_active === true) process.exit(0);
const stopReason = data.reason || '';
if (SAFE_PASSTHROUGH_REASONS.has(stopReason)) process.exit(0);

const sessionId = data.session_id || 'default';
const cwd = data.cwd || process.cwd();
const stateDir = process.env.QE_STATE_DIR || join(cwd, '.qe', 'state');
const transcriptPath = data.transcript_path || '';

let ratio = 0;
try {
  ratio = estimateUsageRatio(transcriptPath);
} catch {
  process.exit(0);
}

// Auto-recovery: reset blocks when context drops below 50%
if (ratio < RESET_RATIO) {
  try { resetBlocks(sessionId, stateDir); } catch {}
  process.exit(0);
}

const currentBlocks = getBlockCount(sessionId, stateDir);

if (ratio >= CRITICAL_RATIO && currentBlocks < MAX_BLOCKS) {
  // Block and increment counter
  let newCount = currentBlocks;
  try { newCount = recordBlock(sessionId, stateDir); } catch {}
  console.log(JSON.stringify({
    decision: 'block',
    reason: `context-guard: critical ${Math.round(ratio * 100)}% — consider /Qcompact then resume`,
  }));
} else if (ratio >= WARN_RATIO && currentBlocks < MAX_BLOCKS) {
  // Warn only — do not block
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'Stop',
      additionalContext: `⚠️ Context at ${Math.round(ratio * 100)}% — plan for /Qcompact soon`,
    },
  }));
}

// Else exit 0 silently (MAX_BLOCKS reached or ratio below warn threshold)
