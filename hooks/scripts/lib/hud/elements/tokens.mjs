/**
 * hud/elements/tokens.mjs
 * Session token count element. Formats input+output as "42.3k tok".
 */

/**
 * Format a token count as a compact string (42300 → "42.3k").
 * @param {number} n
 * @returns {string}
 */
export function formatTokens(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return '0';
  if (n < 1000) return String(n);
  const k = n / 1000;
  if (k < 10) return `${k.toFixed(1)}k`;
  // Promote to M at 999_500+ to avoid rendering "1000k" (rounds up to 1M).
  if (k < 999.5) return `${Math.round(k)}k`;
  return `${(k / 1000).toFixed(1)}M`;
}

/**
 * Extract total session tokens (input + output) from the payload.
 * @param {object} data
 * @returns {number|null}
 */
export function pickSessionTokens(data) {
  const cw = data?.context_window;
  if (!cw) return null;
  const input = typeof cw.total_input_tokens === 'number' ? cw.total_input_tokens : 0;
  const output = typeof cw.total_output_tokens === 'number' ? cw.total_output_tokens : 0;
  if (input === 0 && output === 0) return null;
  return input + output;
}

/**
 * Element render: dimmed "42.3k tok", or null.
 * @param {{ data: object }} ctx
 * @param {{ dim: Function }} painter
 * @returns {string|null}
 */
export function render(ctx, painter) {
  const tokens = pickSessionTokens(ctx.data);
  if (tokens === null) return null;
  return painter.dim(`${formatTokens(tokens)} tok`);
}
