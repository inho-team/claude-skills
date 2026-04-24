/**
 * hud/elements/context.mjs
 * Context-window usage element. Reads `context_window.used_percentage`
 * from the statusLine payload and renders a colored "ctx N%" chunk.
 */

import { usedColor } from '../colors.mjs';

/**
 * Extract the context used percentage from the payload.
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
 * Element render: returns a colored "ctx 32%" chunk, or null to skip.
 * @param {{ data: object }} ctx
 * @param {{ paint: Function }} painter
 * @returns {string|null}
 */
export function render(ctx, painter) {
  const pct = pickContextUsed(ctx.data);
  if (pct === null) return null;
  return painter.paint(usedColor(pct), `ctx ${pct}%`);
}
