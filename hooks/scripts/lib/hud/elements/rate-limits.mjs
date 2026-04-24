/**
 * hud/elements/rate-limits.mjs
 * Anthropic 5h / 7d rate-limit usage element. Renders "5h 12%·7d 34%".
 */

import { usedColor } from '../colors.mjs';

/**
 * Extract the 5-hour / 7-day rate-limit usage percentages from the payload.
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
 * Element render: returns a dot-joined rate-limit chunk, or null to skip.
 * @param {{ data: object }} ctx
 * @param {{ paint: Function, dim: Function }} painter
 * @returns {string|null}
 */
export function render(ctx, painter) {
  const { fiveHour, sevenDay } = pickRateLimits(ctx.data);
  if (fiveHour === null && sevenDay === null) return null;
  const chunks = [];
  if (fiveHour !== null) chunks.push(painter.paint(usedColor(fiveHour), `5h ${fiveHour}%`));
  if (sevenDay !== null) chunks.push(painter.paint(usedColor(sevenDay), `7d ${sevenDay}%`));
  return chunks.join(painter.dim('·'));
}
