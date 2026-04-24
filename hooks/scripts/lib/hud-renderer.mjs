/**
 * @fileoverview QE HUD renderer — pure functions that build the statusline string.
 *
 * The Claude Code statusLine hook receives a JSON payload on stdin. This module
 * turns that payload (plus the parsed SIVS config) into a single-line HUD string
 * with ANSI color codes. Separated from the stdin wrapper so it can be unit-tested.
 *
 * MVP scope: context %, session tokens, SIVS stage routing.
 * Phase 2 (easy additions): rate_limits.five_hour / rate_limits.seven_day,
 * model.display_name, cost.total_cost_usd.
 *
 * @module hooks/scripts/lib/hud-renderer
 */

const ESC = '\x1b[';
const C = {
  reset: `${ESC}0m`,
  dim: `${ESC}2m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  red: `${ESC}31m`,
  cyan: `${ESC}36m`,
};

const SIVS_STAGES = ['spec', 'implement', 'verify', 'supervise'];

/**
 * Format a token count as a compact string (42300 → "42.3k").
 * @param {number} n
 * @returns {string}
 */
export function formatTokens(n) {
  if (!Number.isFinite(n) || n < 0) return '0';
  // 999_500+ rounds to 1000k under the integer-k branch; promote to M first.
  if (n >= 999_500) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return Math.round(n / 1000) + 'k';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(Math.round(n));
}

/**
 * Pick a color for a "remaining" percentage (higher = healthier).
 * @param {number} pct 0–100
 * @returns {string} ANSI prefix
 */
function remainingColor(pct) {
  if (pct > 50) return C.green;
  if (pct > 20) return C.yellow;
  return C.red;
}

/**
 * Extract the context remaining percentage from the statusLine payload.
 * Prefers `remaining_percentage`; falls back to `100 - used_percentage`.
 * @param {object} data
 * @returns {number|null} integer 0–100, or null if unknown
 */
export function pickContextRemaining(data) {
  const cw = data?.context_window;
  if (!cw) return null;
  if (typeof cw.remaining_percentage === 'number') {
    return Math.round(cw.remaining_percentage);
  }
  if (typeof cw.used_percentage === 'number') {
    return Math.round(100 - cw.used_percentage);
  }
  return null;
}

/**
 * Extract the total session tokens (input + output) from the payload.
 * @param {object} data
 * @returns {number|null}
 */
export function pickSessionTokens(data) {
  const cw = data?.context_window;
  if (!cw) return null;
  const inTok = typeof cw.total_input_tokens === 'number' ? cw.total_input_tokens : 0;
  const outTok = typeof cw.total_output_tokens === 'number' ? cw.total_output_tokens : 0;
  const total = inTok + outTok;
  return total > 0 ? total : null;
}

/**
 * Render the SIVS routing into a compact "CCCC" / "C/X/C/C" string.
 * - All-claude default: "claude"
 * - Mixed: slash-separated initials (C=claude, X=codex)
 *
 * @param {object} sivsConfig parsed .qe/sivs-config.json (or {} when missing)
 * @returns {{ letters: string, mixed: boolean }}
 */
export function renderSivsLetters(sivsConfig) {
  const cfg = sivsConfig && typeof sivsConfig === 'object' ? sivsConfig : {};
  const letters = SIVS_STAGES.map((s) => {
    const eng = cfg?.[s]?.engine ?? 'claude';
    return eng === 'codex' ? 'X' : 'C';
  });
  const mixed = letters.some((l) => l !== 'C');
  return {
    letters: mixed ? letters.join('/') : 'claude',
    mixed,
  };
}

/**
 * Build the HUD string from a statusLine payload + SIVS config.
 * Safe to call with missing or partial data — returns an empty string if
 * there is literally nothing to show.
 *
 * @param {object} data statusLine stdin payload
 * @param {object} sivsConfig parsed sivs-config.json or {} when absent
 * @param {{ noColor?: boolean }} [opts]
 * @returns {string}
 */
export function renderHud(data, sivsConfig, opts = {}) {
  const plain = opts.noColor === true;
  const paint = (color, text) => (plain ? text : `${color}${text}${C.reset}`);
  const dim = (text) => paint(C.dim, text);
  const parts = [];

  const ctxRem = pickContextRemaining(data);
  if (ctxRem !== null) {
    parts.push(paint(remainingColor(ctxRem), `ctx ${ctxRem}%`));
  }

  const tokens = pickSessionTokens(data);
  if (tokens !== null) {
    parts.push(dim(`${formatTokens(tokens)} tok`));
  }

  const sivs = renderSivsLetters(sivsConfig);
  parts.push(dim(`SIVS ${sivs.letters}`));

  // SIVS segment is always pushed, so parts is guaranteed non-empty here.
  const sep = dim('│');
  return parts.join(` ${sep} `);
}
