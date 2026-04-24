/**
 * hud/elements/model.mjs
 * Model label element. Prefers `model.display_name`, falls back to id parsing.
 */

import { C, safe } from '../colors.mjs';

const MODEL_ID_SHORT = [
  { re: /opus/i, label: 'Opus' },
  { re: /sonnet/i, label: 'Sonnet' },
  { re: /haiku/i, label: 'Haiku' },
];

/**
 * Pick a human-readable model label.
 * @param {object} data
 * @returns {string|null}
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
 * Element render: colored model label, or null.
 * @param {{ data: object }} ctx
 * @param {{ paint: Function }} painter
 * @returns {string|null}
 */
export function render(ctx, painter) {
  const model = pickModelName(ctx.data);
  if (!model) return null;
  return painter.paint(C.cyan, model);
}
