/**
 * @fileoverview QE HUD renderer — pure functions that build the statusline string.
 *
 * The Claude Code statusLine hook receives a JSON payload on stdin. This module
 * turns that payload (plus the parsed SIVS config) into a single-line HUD string
 * with ANSI color codes. Separated from the stdin wrapper so it can be unit-tested.
 *
 * Scope: context % used, 5h / 7d rate limits, model, session tokens, SIVS routing.
 * Phase 3 candidates: session cost ($), active SIVS stage highlight, exceeds_200k flag.
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

// Claude display-name heuristic for fallback when model.display_name is absent.
const MODEL_ID_SHORT = [
  { re: /opus/i, label: 'Opus' },
  { re: /sonnet/i, label: 'Sonnet' },
  { re: /haiku/i, label: 'Haiku' },
];

/**
 * Strip ANSI escape sequences and control characters from a string so that
 * untrusted payload fields (model names, future labels) cannot smuggle color
 * codes or cursor-moves into the user's terminal. Preventative hardening for
 * the security review WARN on `model.display_name` reaching stdout.
 *
 * @param {unknown} s
 * @returns {string} sanitized string, or '' if input is not a string
 */
export function safe(s) {
  if (typeof s !== 'string') return '';
  // Drop CSI sequences (ESC [ ... letter) and other common escape prefixes.
  const noEsc = s.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '').replace(/\x1b[@-Z\\-_]/g, '');
  // Drop remaining C0 controls except TAB; drop DEL.
  return noEsc.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
}

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
 * Pick a color for a context *used* percentage (lower = healthier).
 * Inverse of the earlier "remaining" mapping so that a low usage number
 * shows as green and a high one as red.
 * @param {number} pct 0–100 (used %)
 * @returns {string} ANSI prefix
 */
function usedColor(pct) {
  if (pct < 50) return C.green;
  if (pct < 80) return C.yellow;
  return C.red;
}

/**
 * Extract the context *used* percentage from the statusLine payload.
 * Prefers `used_percentage`; falls back to `100 - remaining_percentage`.
 * @param {object} data
 * @returns {number|null} integer 0–100, or null if unknown
 */
export function pickContextUsed(data) {
  const cw = data?.context_window;
  if (!cw) return null;
  if (typeof cw.used_percentage === 'number') {
    return Math.round(cw.used_percentage);
  }
  if (typeof cw.remaining_percentage === 'number') {
    return Math.round(100 - cw.remaining_percentage);
  }
  return null;
}

/**
 * Extract the Anthropic rate-limit usage percentages from the payload.
 * Returns integer 0–100 or null per window.
 *
 * @param {object} data
 * @returns {{ fiveHour: number|null, sevenDay: number|null }}
 */
export function pickRateLimits(data) {
  const rl = data?.rate_limits;
  const read = (bucket) => {
    const raw = bucket?.used_percentage;
    return typeof raw === 'number' ? Math.round(raw) : null;
  };
  return {
    fiveHour: read(rl?.five_hour),
    sevenDay: read(rl?.seven_day),
  };
}

/**
 * Pick a human-readable model label.
 *
 * Prefers `model.display_name` (sanitized). If absent, falls back to matching
 * `model.id` against Opus/Sonnet/Haiku; otherwise returns the raw id.
 *
 * @param {object} data
 * @returns {string|null} short label (e.g., "Opus") or null
 */
export function pickModelName(data) {
  const m = data?.model;
  if (!m) return null;
  const display = safe(m.display_name).trim();
  if (display) return display;
  const id = safe(m.id).trim();
  if (!id) return null;
  for (const { re, label } of MODEL_ID_SHORT) {
    if (re.test(id)) return label;
  }
  return id;
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
 * Render the SIVS routing into a 4-letter slash string: "C/C/C/C", "C/X/C/C", etc.
 * Always emits all four stages so the position of each letter is stable —
 * spec / implement / verify / supervise — and an all-claude setup still
 * shows the structure (`C/C/C/C`) rather than a compact "claude" label.
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
  return {
    letters: letters.join('/'),
    mixed: letters.some((l) => l !== 'C'),
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

  const ctxUsed = pickContextUsed(data);
  if (ctxUsed !== null) {
    parts.push(paint(usedColor(ctxUsed), `ctx ${ctxUsed}%`));
  }

  const { fiveHour, sevenDay } = pickRateLimits(data);
  if (fiveHour !== null || sevenDay !== null) {
    const chunks = [];
    if (fiveHour !== null) chunks.push(paint(usedColor(fiveHour), `5h ${fiveHour}%`));
    if (sevenDay !== null) chunks.push(paint(usedColor(sevenDay), `7d ${sevenDay}%`));
    parts.push(chunks.join(dim('·')));
  }

  const model = pickModelName(data);
  if (model) parts.push(paint(C.cyan, model));

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
