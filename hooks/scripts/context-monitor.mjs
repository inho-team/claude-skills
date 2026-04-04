#!/usr/bin/env node
'use strict';

/**
 * Context Usage Monitor — Auto-Compaction Trigger
 *
 * Monitors context window usage and emits system directives to automatically
 * invoke Ecompact-executor when pressure thresholds are crossed.
 *
 * Behavior:
 * - At 140k tokens (WARNING): Emits ACTION REQUIRED directive with Agent tool
 *   invocation instructions for Ecompact-executor.
 * - At 170k tokens (CRITICAL): Emits MANDATORY stop-and-compact directive.
 *   Overrides cooldown.
 *
 * Design notes:
 * - Claude Code does not expose context remaining directly — token counts
 *   from usage stats are used. The threshold mapping is abstracted so it
 *   can be swapped for real metrics when the API supports them.
 * - Debounce: after the first alert, suppress re-alerts for 5 tool calls
 *   unless severity escalates.
 * - Cooldown: after a compaction trigger, suppress re-triggers for 5 minutes
 *   (tracked in unified-state.json contextCompaction field). CRITICAL
 *   severity bypasses cooldown.
 * - State is persisted in session-stats.json alongside existing fields.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { atomicWriteJson, readUnifiedState, writeUnifiedState } from './lib/state.mjs';
import { loadConfig } from './lib/config.mjs';

// Cooldown period: 5 minutes after a compaction trigger
const COMPACTION_COOLDOWN_MS = 5 * 60 * 1000;

// --- Severity levels ---
const SEVERITY = {
  NONE: 'none',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

// Severity ordering for escalation comparison
const SEVERITY_ORDER = { none: 0, warning: 1, critical: 2 };

// --- Default thresholds (token-based metrics) ---
// These map to approximate context remaining for a 200k context window:
//   WARNING  (~30% remaining) => 140,000 input tokens
//   CRITICAL (~15% remaining) => 170,000 input tokens
// Values can be overridden via .qe/config.json hooks section.
const DEFAULT_THRESHOLDS = {
  context_warning_tokens: 140000,   // ~30% remaining
  context_critical_tokens: 170000,  // ~15% remaining
  context_debounce_count: 5,        // suppress re-alert for N tool calls
};

/**
 * Build context pressure message with token count.
 * Returns a system-instruction-style directive for auto-compaction.
 *
 * @param {string} severity - SEVERITY.WARNING or SEVERITY.CRITICAL
 * @param {number} inputTokens - Current input token count
 * @returns {string} Formatted directive message
 */
function buildDirectiveMessage(severity, inputTokens) {
  const currentK = Math.round(inputTokens / 1000);

  if (severity === SEVERITY.CRITICAL) {
    return [
      `\u{1F534} CRITICAL CONTEXT PRESSURE: ${currentK}k / 200k tokens`,
      'MANDATORY: Stop current work. Invoke Ecompact-executor immediately.',
      'Context will be lost if you continue without compaction.',
      `Run: Agent tool \u2192 subagent_type: "Ecompact-executor", prompt: "Auto-compaction triggered at ${currentK}k tokens"`,
    ].join('\n');
  }

  // WARNING (Yellow zone)
  return [
    `\u26A0\uFE0F CONTEXT PRESSURE: ${currentK}k / 200k tokens (Yellow zone)`,
    'ACTION REQUIRED: Invoke Ecompact-executor to save context snapshot before continuing.',
    `Run: Agent tool \u2192 subagent_type: "Ecompact-executor", prompt: "Auto-compaction triggered at ${currentK}k tokens"`,
  ].join('\n');
}

/**
 * Estimate context severity based on token usage.
 *
 * @param {object} usage - Current usage object from stats
 * @param {object} thresholds - Threshold configuration
 * @returns {string} Severity level (SEVERITY.NONE | WARNING | CRITICAL)
 */
export function estimateSeverity(usage, thresholds) {
  const inputTokens = usage?.input_tokens || 0;
  if (inputTokens >= thresholds.context_critical_tokens) {
    return SEVERITY.CRITICAL;
  }
  if (inputTokens >= thresholds.context_warning_tokens) {
    return SEVERITY.WARNING;
  }
  return SEVERITY.NONE;
}

/**
 * Check whether the alert should be suppressed by debounce logic.
 *
 * Rules:
 * 1. If no previous warning — do not suppress.
 * 2. If severity escalated since last warning — do not suppress (bypass).
 * 3. If fewer than debounce_count tool calls since last warning — suppress.
 *
 * @param {string} currentSeverity
 * @param {object} stats - session-stats.json data
 * @param {object} thresholds
 * @returns {boolean} true if alert should be suppressed
 */
export function shouldDebounce(currentSeverity, stats, thresholds) {
  const lastSeverity = stats.warning_severity || SEVERITY.NONE;
  const lastWarningAt = stats.last_warning_at || 0;
  const debounceCount = thresholds.context_debounce_count;

  // No previous warning — never suppress
  if (lastWarningAt === 0) return false;

  // Severity escalated — bypass debounce
  if (SEVERITY_ORDER[currentSeverity] > SEVERITY_ORDER[lastSeverity]) return false;

  // Within debounce window — suppress
  const callsSinceWarning = (stats.tool_calls || 0) - lastWarningAt;
  return callsSinceWarning < debounceCount;
}

/**
 * Check whether compaction is in cooldown (recently triggered).
 *
 * @param {object} compactionState - contextCompaction object from unified-state
 * @returns {boolean} true if still in cooldown
 */
function isInCooldown(compactionState) {
  if (!compactionState || !compactionState.cooldownUntil) return false;
  return Date.now() < new Date(compactionState.cooldownUntil).getTime();
}

/**
 * Record that compaction was auto-triggered in unified-state.
 *
 * @param {string} cwd - Project working directory
 */
function recordCompactionTrigger(cwd) {
  try {
    const unified = readUnifiedState(cwd);
    const now = new Date().toISOString();
    unified.contextCompaction = {
      lastTriggeredAt: now,
      autoTriggered: true,
      cooldownUntil: new Date(Date.now() + COMPACTION_COOLDOWN_MS).toISOString(),
    };
    writeUnifiedState(cwd, unified);
  } catch {
    // Fault-tolerant: proceed even if state update fails
  }
}

/**
 * Main entry point: evaluate context pressure and return an alert if needed.
 *
 * At 140k tokens (WARNING / Yellow zone), emits a system directive instructing
 * Claude to invoke Ecompact-executor. At 170k tokens (CRITICAL / Red zone),
 * emits a mandatory stop-and-compact directive. A 5-minute cooldown prevents
 * re-triggering after a compaction has already been initiated.
 *
 * @param {string} cwd - Project working directory
 * @param {object} [preloadedStats] - Pre-read session stats (avoids duplicate file I/O)
 * @param {object} [preloadedCfg] - Pre-read config (avoids duplicate loadConfig call)
 * @returns {{ message: string|null, severity: string, stats: object }}
 */
export function checkContextPressure(cwd, preloadedStats, preloadedCfg) {
  const cfg = preloadedCfg || loadConfig(cwd);
  const thresholds = {
    context_warning_tokens: cfg.context_warning_tokens ?? cfg.context_pressure_warn ?? DEFAULT_THRESHOLDS.context_warning_tokens,
    context_critical_tokens: cfg.context_critical_tokens ?? DEFAULT_THRESHOLDS.context_critical_tokens,
    context_debounce_count: cfg.context_debounce_count ?? DEFAULT_THRESHOLDS.context_debounce_count,
  };

  // Use pre-loaded stats or read from disk (fallback for standalone usage)
  let stats;
  let statsFile = null;
  if (preloadedStats) {
    stats = preloadedStats;
  } else {
    statsFile = join(cwd, '.qe', 'state', 'session-stats.json');
    stats = { tool_calls: 0, session_start: Date.now(), usage: { input_tokens: 0 } };
    if (existsSync(statsFile)) {
      try {
        stats = JSON.parse(readFileSync(statsFile, 'utf8'));
      } catch {
        return { message: null, severity: SEVERITY.NONE, stats };
      }
    }
  }

  const severity = estimateSeverity(stats.usage, thresholds);

  if (severity === SEVERITY.NONE) {
    return { message: null, severity, stats };
  }

  // Check compaction cooldown — if recently triggered, suppress unless severity escalated
  try {
    const unified = readUnifiedState(cwd);
    const compactionState = unified.contextCompaction;
    if (compactionState && isInCooldown(compactionState)) {
      // Even during cooldown, CRITICAL always breaks through
      if (severity !== SEVERITY.CRITICAL) {
        return { message: null, severity, stats };
      }
    }
  } catch {
    // Fault-tolerant: proceed with alert if state read fails
  }

  // Debounce check (tool-call-based, separate from cooldown)
  if (shouldDebounce(severity, stats, thresholds)) {
    return { message: null, severity, stats };
  }

  // Update stats with warning metadata
  stats.last_warning_at = stats.usage?.input_tokens || 0;
  stats.warning_severity = severity;
  // Also track call count for historical reference
  stats.last_warning_call = stats.tool_calls || 0;

  // Only write to disk when stats were loaded from disk (not preloaded).
  // When preloadedStats is provided, the caller owns the write lifecycle.
  if (!preloadedStats && statsFile) {
    try {
      atomicWriteJson(statsFile, stats);
    } catch {
      // Fault-tolerant: proceed even if write fails
    }
  }

  // Build directive message with current token count
  const inputTokens = stats.usage?.input_tokens || 0;
  let message = buildDirectiveMessage(severity, inputTokens);

  // Record compaction trigger in unified-state (sets cooldown)
  recordCompactionTrigger(cwd);

  return { message, severity, stats };
}
