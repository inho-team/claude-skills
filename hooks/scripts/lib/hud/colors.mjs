/**
 * hud/colors.mjs
 * ANSI color primitives + threshold coloring + input sanitizer.
 * Kept tiny on purpose so every element file imports from one place.
 *
 * @module hooks/scripts/lib/hud/colors
 */

export const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

/**
 * Pick a color for a *used* percentage (lower = healthier).
 * @param {number} pct 0–100
 * @returns {string} ANSI prefix
 */
export function usedColor(pct) {
  if (pct < 50) return C.green;
  if (pct < 80) return C.yellow;
  return C.red;
}

/**
 * Strip ANSI escape sequences and control chars from untrusted strings so
 * payload fields cannot smuggle color codes or cursor-moves into the user's
 * terminal. Preventative hardening for untrusted model.display_name and
 * similar fields that reach stdout.
 *
 * @param {unknown} s
 * @returns {string} sanitized string, or '' if input is not a string
 */
export function safe(s) {
  if (typeof s !== 'string') return '';
  const noEsc = s.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '').replace(/\x1b[@-Z\\-_]/g, '');
  return noEsc.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
}

/**
 * Build a paint/dim helper pair honoring noColor mode.
 * @param {{ noColor?: boolean }} opts
 * @returns {{ paint: (color: string, text: string) => string, dim: (text: string) => string }}
 */
export function makePainter(opts = {}) {
  const plain = opts.noColor === true;
  const paint = (color, text) => (plain ? text : `${color}${text}${C.reset}`);
  const dim = (text) => paint(C.dim, text);
  return { paint, dim };
}
