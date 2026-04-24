/**
 * hud/elements/phase.mjs
 * Active PSE Phase element — reads .qe/planning/STATE.md, extracts the
 * "Active Phase" line, renders a compact "P: <phase name>" chunk.
 *
 * Unique to QE framework — surfaces the current planning-layer state so
 * the HUD shows what the user is currently working on across sessions.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { C, safe } from '../colors.mjs';

const STATE_PATH = '.qe/planning/STATE.md';
const MAX_PHASE_LABEL = 40;

/**
 * Parse STATE.md for the Active Phase line. Returns the phase label string
 * without the "Active Phase:" prefix, trimmed and length-capped.
 *
 * @param {string} projectRoot absolute project root
 * @returns {string|null} phase label, or null when no active phase
 */
export function pickActivePhase(projectRoot) {
  if (!projectRoot) return null;
  const abs = join(projectRoot, STATE_PATH);
  if (!existsSync(abs)) return null;
  let text;
  try { text = readFileSync(abs, 'utf8'); } catch { return null; }

  // Match "- **Active Phase**: ..." anywhere in the file.
  const m = text.match(/^\s*-\s*\*\*Active Phase\*\*\s*:\s*(.+?)\s*$/m);
  if (!m) return null;
  const raw = safe(m[1]).trim();

  // Skip idle markers — parenthetical "(none active)" or "(idle...)" is noise.
  if (/^\(/.test(raw)) return null;
  if (!raw) return null;

  // Trim overly long phase descriptions; keep the first clause.
  let label = raw.replace(/\s*—.*$/, '').trim();
  if (label.length > MAX_PHASE_LABEL) {
    label = label.slice(0, MAX_PHASE_LABEL - 1) + '…';
  }
  return label;
}

/**
 * Element render: cyan "P: Phase 3 Unified Studio", or null when idle.
 * @param {{ projectRoot: string }} ctx
 * @param {{ paint: Function, dim: Function }} painter
 * @returns {string|null}
 */
export function render(ctx, painter) {
  const label = pickActivePhase(ctx.projectRoot);
  if (!label) return null;
  return `${painter.dim('P:')} ${painter.paint(C.cyan, label)}`;
}
