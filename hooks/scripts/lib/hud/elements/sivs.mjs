/**
 * hud/elements/sivs.mjs
 * SIVS engine routing element. Renders "SIVS C/C/C/C" with a fixed 4-letter
 * slash string — positional layout (spec / implement / verify / supervise).
 */

const SIVS_STAGES = ['spec', 'implement', 'verify', 'supervise'];

/**
 * Render the SIVS routing into a 4-letter slash string.
 * C = claude, X = codex. All four stages always emitted so position is stable.
 *
 * @param {object} sivsConfig parsed .qe/sivs-config.json (or {} when missing)
 * @returns {{ letters: string, mixed: boolean }}
 */
export function renderSivsLetters(sivsConfig) {
  const cfg = sivsConfig || {};
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
 * Element render: dimmed "SIVS C/C/C/C" — always present.
 * @param {{ sivsConfig: object }} ctx
 * @param {{ dim: Function }} painter
 * @returns {string}
 */
export function render(ctx, painter) {
  const { letters } = renderSivsLetters(ctx.sivsConfig);
  return painter.dim(`SIVS ${letters}`);
}
