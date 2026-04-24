/**
 * hud/elements/phase.mjs
 * Active PSE Phase element — resolves the current session's plan via
 * plan-resolver.mjs, reads the matching STATE.md, and renders a compact
 * "P: <slug> · <phase name>" chunk. Falls back to the legacy flat
 * `.qe/planning/STATE.md` when no named plan is resolvable.
 *
 * Unique to QE framework — surfaces the current planning-layer state so
 * the HUD shows what the user is currently working on across sessions.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { C, safe } from '../colors.mjs';
import { resolveActivePlanSlug, resolveStatePath } from '../../plan-resolver.mjs';

const LEGACY_STATE_PATH = '.qe/planning/STATE.md';
const MAX_PHASE_LABEL = 40;
const MAX_SLUG_LABEL = 20;

/**
 * Parse STATE.md for the Active Phase line. Returns the phase label string
 * without the "Active Phase:" prefix, trimmed and length-capped.
 *
 * Backward compat: when `sessionId` is omitted the function falls back to the
 * flat `.qe/planning/STATE.md` layout so existing test fixtures keep working.
 *
 * @param {string} projectRoot absolute project root
 * @param {string|null} [sessionId] Claude Code session id
 * @returns {string|null} phase label, or null when no active phase
 */
export function pickActivePhase(projectRoot, sessionId = null) {
  if (!projectRoot) return null;
  const statePath = resolveStatePath(projectRoot, sessionId)
    || join(projectRoot, LEGACY_STATE_PATH);
  if (!existsSync(statePath)) return null;
  let text;
  try { text = readFileSync(statePath, 'utf8'); } catch { return null; }

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
 * Element render: cyan "P: auth-refactor · Phase 3", or null when idle.
 * When the active plan resolves to a named slug, the slug is prefixed so
 * multi-terminal users can see which stream this session is working on.
 *
 * @param {{ projectRoot: string, data?: object }} ctx
 * @param {{ paint: Function, dim: Function }} painter
 * @returns {string|null}
 */
export function render(ctx, painter) {
  const sessionId = ctx?.data?.session_id || ctx?.data?.sessionId || null;
  const label = pickActivePhase(ctx.projectRoot, sessionId);
  if (!label) return null;
  const slug = resolveActivePlanSlug(ctx.projectRoot, sessionId);
  const slugPart = slug ? `${truncateSlug(slug)} · ` : '';
  return `${painter.dim('P:')} ${painter.paint(C.cyan, `${slugPart}${label}`)}`;
}

/**
 * Cap a slug at MAX_SLUG_LABEL with an ellipsis so the HUD stays compact.
 *
 * @param {string} slug validated plan slug
 * @returns {string}
 */
function truncateSlug(slug) {
  if (slug.length <= MAX_SLUG_LABEL) return slug;
  return slug.slice(0, MAX_SLUG_LABEL - 1) + '…';
}
