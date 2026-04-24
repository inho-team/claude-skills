/**
 * lib/session-resolver.mjs
 *
 * Per-session partitioning for Qcompact / Qresume artifacts. Multiple Claude
 * terminals can run against the same project in parallel, so context snapshots
 * and handoff documents must live under their own session directory instead
 * of a shared flat path that the next terminal would clobber.
 *
 * Layout:
 *   .qe/context/sessions/{sid}/snapshot.md
 *   .qe/context/sessions/{sid}/SNAPSHOT_SUMMARY.md
 *   .qe/context/sessions/{sid}/decisions.md
 *   .qe/context/sessions/{sid}/compact-trigger.json
 *   .qe/handoffs/sessions/{sid}/HANDOFF_{date}_{time}.md
 *
 * The {sid} is an 8-char prefix of the Claude Code session id — short enough
 * for human-friendly directory names, wide enough that practical collision
 * across concurrent project sessions is negligible (<= dozens of sessions).
 *
 * Auto-naming only. There is no user-supplied slug; if the resolver cannot
 * find a session id it falls back to the `_unknown` bucket so writes never
 * fail silently. Pre-partition snapshots are migrated once into `_legacy`
 * the first time a session starts after the upgrade.
 */

import { readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const STATE_FILE = '.qe/state/current-session.json';
const CONTEXT_BASE = '.qe/context';
const HANDOFF_BASE = '.qe/handoffs';
const SESSIONS_SUBDIR = 'sessions';
const LEGACY_BUCKET = '_legacy';
const UNKNOWN_BUCKET = '_unknown';

// Files we look for inside each session bucket when listing snapshots.
// Migration of pre-partition flat copies of these files lives in
// `lib/legacy-migrator.mjs` so the registry stays in one place.
const SESSION_CONTEXT_FILES = [
  'snapshot.md',
  'SNAPSHOT_SUMMARY.md',
  'decisions.md',
  'compact-trigger.json'
];

/**
 * Shorten a raw Claude Code session id into the 8-char auto-name used for
 * session directories. Strips hyphens (UUID style) before slicing so the
 * resulting prefix is from the high-entropy head, not the dash region.
 *
 * @param {unknown} raw session id from hook payload or state file
 * @returns {string|null} 8-char `[a-z0-9]` slug, or null when invalid
 */
export function shortenSid(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.toLowerCase().replace(/-/g, '').replace(/[^a-z0-9]/g, '');
  if (cleaned.length < 8) return null;
  const sid = cleaned.slice(0, 8);
  return /^[a-z0-9]{8}$/.test(sid) ? sid : null;
}

/**
 * Validate a slug used as an on-disk session directory name. Accepts the
 * 8-char auto-name shape and the two reserved bucket names. Rejects anything
 * that could escape the sessions/ root (`..`, slashes, whitespace).
 *
 * @param {unknown} raw bucket name from caller or directory listing
 * @returns {string|null}
 */
export function normalizeSidBucket(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (s === LEGACY_BUCKET || s === UNKNOWN_BUCKET) return s;
  return /^[a-z0-9]{8}$/.test(s) ? s : null;
}

/**
 * Resolve the current Claude session's short sid by reading the pointer file
 * the SessionStart hook writes. Returns null when the file is absent or the
 * stored id fails validation — callers fall back to the `_unknown` bucket.
 *
 * @param {string} projectRoot
 * @returns {string|null}
 */
export function readCurrentSid(projectRoot) {
  if (!projectRoot) return null;
  const p = join(projectRoot, STATE_FILE);
  if (!existsSync(p)) return null;
  try {
    const data = JSON.parse(readFileSync(p, 'utf8'));
    return shortenSid(data?.session_id ?? data?.sessionId);
  } catch {
    return null;
  }
}

/**
 * Resolve the sid to use for this call: explicit override → state file →
 * `_unknown` bucket. Always returns a writable bucket so writers never have
 * to special-case "no session" — bookkeeping still survives even when the
 * pointer is missing (e.g., hook never ran).
 *
 * @param {string} projectRoot
 * @param {string|null} [overrideSid] short sid passed explicitly by caller
 * @returns {string} bucket name guaranteed to be safe for join()
 */
export function resolveSid(projectRoot, overrideSid) {
  return normalizeSidBucket(overrideSid)
    ?? readCurrentSid(projectRoot)
    ?? UNKNOWN_BUCKET;
}

/**
 * Path to the per-session context directory. Creating the directory is the
 * caller's responsibility — use `ensureSessionDirs` when about to write.
 *
 * @param {string} projectRoot
 * @param {string|null} [sid]
 * @returns {string}
 */
export function getSessionContextDir(projectRoot, sid) {
  const bucket = resolveSid(projectRoot, sid);
  return join(projectRoot, CONTEXT_BASE, SESSIONS_SUBDIR, bucket);
}

/**
 * Path to the per-session handoff directory.
 *
 * @param {string} projectRoot
 * @param {string|null} [sid]
 * @returns {string}
 */
export function getSessionHandoffDir(projectRoot, sid) {
  const bucket = resolveSid(projectRoot, sid);
  return join(projectRoot, HANDOFF_BASE, SESSIONS_SUBDIR, bucket);
}

/**
 * mkdir -p both per-session directories. Returns the resolved sid so the
 * caller can include it in log lines.
 *
 * @param {string} projectRoot
 * @param {string|null} [sid]
 * @returns {{ sid: string, contextDir: string, handoffDir: string }}
 */
export function ensureSessionDirs(projectRoot, sid) {
  const bucket = resolveSid(projectRoot, sid);
  const contextDir = join(projectRoot, CONTEXT_BASE, SESSIONS_SUBDIR, bucket);
  const handoffDir = join(projectRoot, HANDOFF_BASE, SESSIONS_SUBDIR, bucket);
  mkdirSync(contextDir, { recursive: true });
  mkdirSync(handoffDir, { recursive: true });
  return { sid: bucket, contextDir, handoffDir };
}

/**
 * Enumerate available session buckets for `/Qresume --list`. Each entry
 * carries the bucket name plus the latest mtime found among its context
 * files, so the caller can sort newest-first and flag stale snapshots.
 *
 * @param {string} projectRoot
 * @returns {Array<{ sid: string, mtimeMs: number, hasSnapshot: boolean }>}
 */
export function listSessionBuckets(projectRoot) {
  if (!projectRoot) return [];
  const root = join(projectRoot, CONTEXT_BASE, SESSIONS_SUBDIR);
  if (!existsSync(root)) return [];
  let names = [];
  try {
    names = readdirSync(root);
  } catch {
    return [];
  }
  const out = [];
  for (const name of names) {
    if (!normalizeSidBucket(name)) continue;
    const dir = join(root, name);
    let latest = 0;
    let hasSnapshot = false;
    for (const f of SESSION_CONTEXT_FILES) {
      const p = join(dir, f);
      if (!existsSync(p)) continue;
      try {
        const st = statSync(p);
        if (st.mtimeMs > latest) latest = st.mtimeMs;
        if (f === 'snapshot.md') hasSnapshot = true;
      } catch {
        // skip unreadable file
      }
    }
    out.push({ sid: name, mtimeMs: latest, hasSnapshot });
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}
