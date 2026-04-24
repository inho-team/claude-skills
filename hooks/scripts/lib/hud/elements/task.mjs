/**
 * hud/elements/task.mjs
 * Active task element — reads .qe/tasks/pending/TASK_REQUEST_*.md (the most
 * recently modified file wins when multiple exist), extracts the UUID and
 * task title from the first heading, renders a compact chunk.
 *
 * Unique to QE framework — surfaces the in-flight PSE task so the HUD shows
 * which UUID the user is currently executing.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { C, safe } from '../colors.mjs';

const PENDING_DIR = '.qe/tasks/pending';
const TASK_PATTERN = /^TASK_REQUEST_([a-f0-9]{8})\.md$/i;
const MAX_TITLE_LABEL = 30;

/**
 * Find the most recently modified pending TASK_REQUEST file and extract
 * { uuid, title } from its filename + first heading.
 *
 * @param {string} projectRoot absolute project root
 * @returns {{ uuid: string, title: string }|null}
 */
export function pickActiveTask(projectRoot) {
  if (!projectRoot) return null;
  const dir = join(projectRoot, PENDING_DIR);
  if (!existsSync(dir)) return null;

  let entries;
  try { entries = readdirSync(dir); } catch { return null; }

  const matches = [];
  for (const name of entries) {
    const m = TASK_PATTERN.exec(name);
    if (!m) continue;
    const full = join(dir, name);
    let mtime = 0;
    try { mtime = statSync(full).mtimeMs; } catch { continue; }
    matches.push({ uuid: m[1], path: full, mtime });
  }
  if (matches.length === 0) return null;

  matches.sort((a, b) => b.mtime - a.mtime);
  const winner = matches[0];

  let title = '';
  try {
    const text = readFileSync(winner.path, 'utf8');
    // First H1 — skip the leading HTML comment (chained-from marker) if any.
    const h1 = text.match(/^#\s+(.+?)\s*$/m);
    if (h1) {
      // Drop the "TASK_REQUEST_UUID.md —" prefix if present, keep the descriptive tail.
      title = safe(h1[1]).replace(/^TASK_REQUEST_[a-f0-9]+\.md\s*—\s*/i, '').trim();
    }
  } catch { /* silent */ }

  if (title.length > MAX_TITLE_LABEL) {
    title = title.slice(0, MAX_TITLE_LABEL - 1) + '…';
  }
  return { uuid: winner.uuid, title };
}

/**
 * Element render: dim "T:" + yellow UUID + optional dimmed title.
 * @param {{ projectRoot: string }} ctx
 * @param {{ paint: Function, dim: Function }} painter
 * @returns {string|null}
 */
export function render(ctx, painter) {
  const t = pickActiveTask(ctx.projectRoot);
  if (!t) return null;
  const parts = [painter.dim('T:'), painter.paint(C.yellow, t.uuid)];
  if (t.title) parts.push(painter.dim(t.title));
  return parts.join(' ');
}
