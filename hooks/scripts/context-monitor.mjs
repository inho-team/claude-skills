#!/usr/bin/env node
'use strict';

/**
 * Context Usage Monitor
 *
 * Monitors context window usage via tool call count as a proxy for context
 * consumption. Provides WARNING (35% estimated remaining) and CRITICAL
 * (25% estimated remaining) alerts with debounce logic.
 *
 * Design notes:
 * - Claude Code does not expose context remaining directly — tool call count
 *   is used as an approximation. The threshold mapping is abstracted so it
 *   can be swapped for real metrics when the API supports them.
 * - Debounce: after the first alert, suppress re-alerts for 5 tool calls
 *   unless severity escalates.
 * - State is persisted in session-stats.json alongside existing fields.
 * - Does not use imperative tone toward the user (GSD principle).
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { atomicWriteJson } from './lib/state.mjs';
import { loadConfig } from './lib/config.mjs';

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

// --- Messages (non-imperative tone) ---
const MESSAGES = {
  [SEVERITY.WARNING]: [
    '[Context Monitor - WARNING] Estimated ~30% context remaining (>= 140k tokens).',
    'Starting new complex tasks at this point may lead to incomplete results.',
    'It may be a good time to wrap up current work or consolidate progress.',
    'Running /Qcompact can help reclaim context space.',
  ].join(' '),

  [SEVERITY.CRITICAL]: [
    '[Context Monitor - CRITICAL] Context usage is at a critical level (>= 170k tokens) — estimated ~15% remaining.',
    'Context exhaustion is imminent.',
    'Running Ecompact-executor now is strongly recommended to preserve session continuity.',
    'If in Utopia mode, Ecompact-executor will handle compaction automatically.',
  ].join(' '),
};

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
 * Main entry point: evaluate context pressure and return an alert if needed.
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

  // Debounce check
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

  // Check Utopia mode for tailored message
  let message = MESSAGES[severity];
  const utopiaFile = join(cwd, '.qe', 'state', 'utopia-state.json');
  if (severity === SEVERITY.CRITICAL) {
    try {
      if (existsSync(utopiaFile)) {
        const utopiaState = JSON.parse(readFileSync(utopiaFile, 'utf8'));
        if (utopiaState.enabled === true) {
          message = [
            '[Context Monitor - CRITICAL] Estimated ~15% context remaining.',
            'Context exhaustion is imminent in Utopia mode (>= 170k tokens).',
            'Ecompact-executor should be triggered now to preserve autonomous session continuity.',
          ].join(' ');
        }
      }
    } catch {
      // Fault-tolerant: use default message
    }
  }

  return { message, severity, stats };
}
