/**
 * hud-renderer.mjs (compatibility shim)
 *
 * The HUD implementation moved to `hud/` as element modules + a preset-driven
 * composer. This file re-exports the old public surface so existing callers
 * (`statusline.mjs`, old tests) keep working.
 *
 * New code should import from `./hud/renderer.mjs` + individual elements.
 *
 * @module hooks/scripts/lib/hud-renderer
 */

import { render as composeRender } from './hud/renderer.mjs';

// Re-export individual primitives + pickers so existing tests keep passing.
export { safe } from './hud/colors.mjs';
export { formatTokens, pickSessionTokens } from './hud/elements/tokens.mjs';
export { pickContextUsed } from './hud/elements/context.mjs';
export { pickRateLimits } from './hud/elements/rate-limits.mjs';
export { pickModelName } from './hud/elements/model.mjs';
export { renderSivsLetters } from './hud/elements/sivs.mjs';

/**
 * Legacy single-preset entry point. Preserves the v6.6.3 output shape by
 * defaulting to the `session` preset. New callers should prefer
 * `./hud/renderer.mjs::render()` which accepts a `preset` option.
 *
 * @param {object} data statusLine payload
 * @param {object} sivsConfig parsed .qe/sivs-config.json or {}
 * @param {{ noColor?: boolean, preset?: string, projectRoot?: string }} [opts]
 * @returns {string}
 */
export function renderHud(data, sivsConfig, opts = {}) {
  return composeRender(data, sivsConfig, opts);
}
