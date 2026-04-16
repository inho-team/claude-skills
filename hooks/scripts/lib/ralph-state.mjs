#!/usr/bin/env node
'use strict';

/**
 * Ralph State — Qutopia Ralph integration state management, rate limiting,
 * progress tracking, and report generation.
 *
 * Ralph state is stored in `.qe/state/ralph-state.json` and provides:
 *   - Initialization with mode, task source, and configuration
 *   - Rate limiting (max requests per hour)
 *   - Circuit breaker (consecutive failure tracking)
 *   - Loop counting and progress updates
 *   - Report generation with duration and completion stats
 *
 * Integration pattern:
 *
 *   import {
 *     createRalphState,
 *     readRalphState,
 *     incrementLoop,
 *     checkRateLimit,
 *     recordCircuitBreaker,
 *     cleanupRalphState,
 *     generateReport,
 *   } from './lib/ralph-state.mjs';
 *
 *   const cwd = process.cwd();
 *
 *   // Initialize
 *   createRalphState(cwd, {
 *     mode: 'work',
 *     taskSource: '/path/to/VERIFY_CHECKLIST',
 *     maxLoops: 50,
 *     maxPerHour: 100,
 *     maxConsecutiveFailures: 3,
 *   });
 *
 *   // Check rate limit before loop
 *   const rateLimitCheck = checkRateLimit(cwd);
 *   if (!rateLimitCheck.allowed) {
 *     console.log(`Rate limited. Reset in ${rateLimitCheck.resetIn}ms`);
 *     process.exit(1);
 *   }
 *
 *   // Execute loop
 *   const loopResult = incrementLoop(cwd);
 *   if (loopResult.exceeded) {
 *     console.log('Max loops exceeded');
 *     process.exit(1);
 *   }
 *
 *   // Record success/failure
 *   const cbResult = recordCircuitBreaker(cwd, true); // success
 *   if (cbResult.tripped) {
 *     console.log('Circuit breaker tripped');
 *     process.exit(1);
 *   }
 *
 *   // Update progress
 *   updateRalphProgress(cwd, { completed: 5, remaining: 7 });
 *
 *   // Print progress
 *   const msg = formatProgressMessage(cwd); // "5/12 done (42%) — Loop #1"
 *   console.log(msg);
 *
 *   // Generate final report
 *   generateReport(cwd);
 *
 *   // Cleanup
 *   cleanupRalphState(cwd);
 *
 * @module ralph-state
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { readUnifiedState, writeUnifiedState } from './state.mjs';
import { exitPersistentMode } from './persistent-mode.mjs';

/**
 * Get ralph state file path.
 * @param {string} cwd - Project root directory
 * @returns {string} Absolute path to .qe/state/ralph-state.json
 */
function getRalphStatePath(cwd) {
  return join(cwd, '.qe', 'state', 'ralph-state.json');
}

/**
 * Get ralph report file path
 * @param {string} cwd - Project root directory
 * @returns {string} Absolute path to .qe/state/ralph-report.json
 */
function getRalphReportPath(cwd) {
  return join(cwd, '.qe', 'state', 'ralph-report.json');
}

/**
 * Atomically write ralph state JSON file
 * @param {string} filePath - Target file path
 * @param {object} data - JSON data to write
 */
function atomicWriteRalphFile(filePath, data) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    throw err;
  }
}

/**
 * Create ralph state in .qe/state/ralph-state.json with defaults.
 * Initializes a new ralph state object with mode, task source, and configuration
 * for rate limiting, loop counting, and circuit breaker tracking.
 *
 * @param {string} cwd - Project root directory
 * @param {object} options - Configuration options
 * @param {string} options.mode - 'work' | 'qa' or other mode string
 * @param {string} options.taskSource - Path to VERIFY_CHECKLIST file
 * @param {number} [options.maxLoops=50] - Maximum loop count before exit
 * @param {number} [options.maxPerHour=100] - Rate limit: max requests per hour
 * @param {number} [options.maxConsecutiveFailures=3] - Circuit breaker threshold
 * @returns {object} Created state object with enabled, mode, progress, and metadata
 */
export function createRalphState(cwd, options) {
  const now = new Date().toISOString();
  const state = {
    enabled: true,
    mode: options.mode || 'work',
    taskSource: options.taskSource || '',
    progress: {
      total: 0,
      completed: 0,
      remaining: 0,
      skipped: 0,
    },
    loopCount: 0,
    maxLoops: options.maxLoops ?? 50,
    rateLimit: {
      maxPerHour: options.maxPerHour ?? 100,
      currentHourCount: 0,
      hourStart: now,
    },
    circuitBreaker: {
      consecutiveFailures: 0,
      maxConsecutiveFailures: options.maxConsecutiveFailures ?? 3,
    },
    startedAt: now,
    lastLoopAt: now,
  };

  const filePath = getRalphStatePath(cwd);
  atomicWriteRalphFile(filePath, state);

  return state;
}

/**
 * Read ralph state from .qe/state/ralph-state.json.
 * Returns parsed JSON state object or null if file does not exist.
 *
 * @param {string} cwd - Project root directory
 * @returns {object|null} Parsed state object, or null if file missing
 */
export function readRalphState(cwd) {
  const filePath = getRalphStatePath(cwd);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Update ralph progress with given progress object
 * Merges progress fields and updates lastLoopAt timestamp
 * @param {string} cwd - Project root directory
 * @param {object} progress - Progress delta/updates (completed, remaining, skipped, etc.)
 * @returns {object|null} Updated state, or null if state missing
 */
export function updateRalphProgress(cwd, progress) {
  const state = readRalphState(cwd);
  if (!state) return null;

  state.progress = {
    ...state.progress,
    ...progress,
  };
  state.lastLoopAt = new Date().toISOString();

  const filePath = getRalphStatePath(cwd);
  atomicWriteRalphFile(filePath, state);

  return state;
}

/**
 * Check rate limit: compare current time against hourStart
 * If > 1h has elapsed, reset currentHourCount to 0 and update hourStart
 * @param {string} cwd - Project root directory
 * @returns {object} { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(cwd) {
  const state = readRalphState(cwd);
  if (!state) {
    return { allowed: true, remaining: -1, resetIn: 0 };
  }

  const now = new Date();
  const hourStart = new Date(state.rateLimit.hourStart);
  const elapsedMs = now - hourStart;
  const HOUR_MS = 60 * 60 * 1000;

  // If > 1 hour has elapsed, reset
  if (elapsedMs > HOUR_MS) {
    state.rateLimit.currentHourCount = 0;
    state.rateLimit.hourStart = now.toISOString();
    state.lastLoopAt = now.toISOString();

    const filePath = getRalphStatePath(cwd);
    atomicWriteRalphFile(filePath, state);

    const remaining = state.rateLimit.maxPerHour;
    return { allowed: true, remaining, resetIn: 0 };
  }

  const remaining = state.rateLimit.maxPerHour - state.rateLimit.currentHourCount;
  const allowed = remaining > 0;
  const resetIn = HOUR_MS - elapsedMs;

  return { allowed, remaining, resetIn };
}

/**
 * Increment loop count and rate limit counter
 * Updates lastLoopAt and increments rateLimit.currentHourCount
 * @param {string} cwd - Project root directory
 * @returns {object} { exceeded: boolean, loopCount: number, maxLoops: number }
 */
export function incrementLoop(cwd) {
  const state = readRalphState(cwd);
  if (!state) {
    return { exceeded: true, loopCount: 0, maxLoops: 50 };
  }

  state.loopCount += 1;
  state.rateLimit.currentHourCount += 1;
  state.lastLoopAt = new Date().toISOString();

  const filePath = getRalphStatePath(cwd);
  atomicWriteRalphFile(filePath, state);

  const exceeded = state.loopCount >= state.maxLoops;
  return { exceeded, loopCount: state.loopCount, maxLoops: state.maxLoops };
}

/**
 * Record circuit breaker state: reset on success, increment on failure
 * If consecutiveFailures >= maxConsecutiveFailures, circuit is tripped
 * @param {string} cwd - Project root directory
 * @param {boolean} success - True if operation succeeded, false otherwise
 * @returns {object} { tripped: boolean, consecutiveFailures: number, max: number }
 */
export function recordCircuitBreaker(cwd, success) {
  const state = readRalphState(cwd);
  if (!state) {
    return { tripped: false, consecutiveFailures: 0, max: 3 };
  }

  if (success) {
    state.circuitBreaker.consecutiveFailures = 0;
  } else {
    state.circuitBreaker.consecutiveFailures += 1;
  }

  state.lastLoopAt = new Date().toISOString();

  const filePath = getRalphStatePath(cwd);
  atomicWriteRalphFile(filePath, state);

  const tripped = state.circuitBreaker.consecutiveFailures >= state.circuitBreaker.maxConsecutiveFailures;
  return {
    tripped,
    consecutiveFailures: state.circuitBreaker.consecutiveFailures,
    max: state.circuitBreaker.maxConsecutiveFailures,
  };
}

/**
 * Clean up ralph state: deletes ralph-state.json and exits persistent mode
 * @param {string} cwd - Project root directory
 */
export function cleanupRalphState(cwd) {
  const filePath = getRalphStatePath(cwd);
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath);
    } catch {}
  }

  // Exit persistent mode
  try {
    exitPersistentMode(cwd);
  } catch {}
}

/**
 * Generate completion report: reads current state, computes duration,
 * writes .qe/state/ralph-report.json with completion metadata
 * @param {string} cwd - Project root directory
 * @returns {object|null} Report object, or null if state missing
 */
export function generateReport(cwd) {
  const state = readRalphState(cwd);
  if (!state) return null;

  const now = new Date();
  const startedAt = new Date(state.startedAt);
  const durationMs = now - startedAt;

  const report = {
    completedAt: now.toISOString(),
    totalLoops: state.loopCount,
    durationMs,
    progress: state.progress,
    skipped: state.progress.skipped || 0,
    failed: state.circuitBreaker.consecutiveFailures,
    circuitBreakerTripped: state.circuitBreaker.consecutiveFailures >= state.circuitBreaker.maxConsecutiveFailures,
  };

  const filePath = getRalphReportPath(cwd);
  atomicWriteRalphFile(filePath, report);

  return report;
}

/**
 * Format a progress message from current ralph state
 * Returns string like "7/12 done (58%) — Loop #4" or empty string if state missing
 * @param {string} cwd - Project root directory
 * @returns {string} Formatted progress message
 */
export function formatProgressMessage(cwd) {
  const state = readRalphState(cwd);
  if (!state) return '';

  const { completed, total } = state.progress;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const loopNum = state.loopCount;

  return `${completed}/${total} done (${percent}%) — Loop #${loopNum}`;
}
