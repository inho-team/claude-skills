// Adapted from oh-my-claudecode (MIT, © 2025 Yeachan Heo).
// See https://github.com/Yeachan-Heo/oh-my-claudecode for original.
#!/usr/bin/env node
'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
import { recordIteration, getState } from './lib/iteration-tracker.mjs';

const DEFAULT_MAX_ITERATIONS = 200;
const DEFAULT_STALE_SECONDS = 7200; // 2 hours

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

const sessionId = data.session_id || 'default';
const cwd = data.cwd || process.cwd();
const stateDir = process.env.QE_STATE_DIR || join(cwd, '.qe', 'state');

const MAX_ITERATIONS = parseInt(process.env.QE_MAX_ITERATIONS || '', 10) || DEFAULT_MAX_ITERATIONS;
const STALE_SECONDS = parseInt(process.env.QE_STALE_SECONDS || '', 10) || DEFAULT_STALE_SECONDS;

// Capture the state before incrementing so we can compute staleness from the
// previous lastActivity (not the one we're about to write).
const prevState = getState(sessionId, stateDir);
const prevLastActivity = prevState?.lastActivity ?? null;

let count = 0;
try {
  const result = recordIteration(sessionId, stateDir);
  count = result.count;
} catch {
  process.exit(0);
}

const now = Math.floor(Date.now() / 1000);
const staleSeconds = prevLastActivity !== null ? now - prevLastActivity : 0;

const iterLimitHit = count >= MAX_ITERATIONS;
const staleLimitHit = prevLastActivity !== null && staleSeconds >= STALE_SECONDS;

if (iterLimitHit || staleLimitHit) {
  const reason = iterLimitHit
    ? `count=${count}`
    : `stale=${staleSeconds}s`;
  console.log(JSON.stringify({
    decision: 'approve',
    reason: `persistence-safety: hard limit reached (${reason})`,
  }));
}

// Otherwise exit 0 silently
