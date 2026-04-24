/**
 * session-resolver.test.mjs
 * Unit tests for per-session partitioning of Qcompact / Qresume artifacts.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  shortenSid,
  normalizeSidBucket,
  readCurrentSid,
  resolveSid,
  getSessionContextDir,
  getSessionHandoffDir,
  ensureSessionDirs,
  listSessionBuckets,
} from '../session-resolver.mjs';

/**
 * Create an isolated temp project root for one test case. Each call returns
 * a unique directory under the OS tmpdir so parallel test cases never share
 * state; callers are responsible for `rmSync`-ing it in a finally block.
 *
 * @returns {string} absolute path to a fresh temp directory
 */
function mkroot() {
  return mkdtempSync(join(tmpdir(), 'sess-resolver-'));
}

// ---------------------------------------------------------------------------
// shortenSid
// ---------------------------------------------------------------------------

test('shortenSid: takes first 8 lowercase hex chars from UUID', () => {
  assert.equal(shortenSid('A1B2C3D4-E5F6-7890-1234-56789ABCDEF0'), 'a1b2c3d4');
});

test('shortenSid: hyphens stripped before slicing so the head is high-entropy', () => {
  assert.equal(shortenSid('--ab-cd-ef-12-34'), 'abcdef12');
});

test('shortenSid: rejects non-strings, short inputs, and empty', () => {
  assert.equal(shortenSid(undefined), null);
  assert.equal(shortenSid(null), null);
  assert.equal(shortenSid(''), null);
  assert.equal(shortenSid(12345678), null);
  assert.equal(shortenSid('abc'), null);
});

test('shortenSid: filters out non-alphanumeric noise but still slices 8 from the rest', () => {
  assert.equal(shortenSid('aa/bb..cc dd ee ff 11 22'), 'aabbccdd');
});

// ---------------------------------------------------------------------------
// normalizeSidBucket
// ---------------------------------------------------------------------------

test('normalizeSidBucket: accepts 8-char hex slugs', () => {
  assert.equal(normalizeSidBucket('a1b2c3d4'), 'a1b2c3d4');
});

test('normalizeSidBucket: accepts reserved buckets _legacy and _unknown', () => {
  assert.equal(normalizeSidBucket('_legacy'), '_legacy');
  assert.equal(normalizeSidBucket('_unknown'), '_unknown');
});

test('normalizeSidBucket: rejects path-traversal and non-canonical shapes', () => {
  assert.equal(normalizeSidBucket('..'), null);
  assert.equal(normalizeSidBucket('../etc'), null);
  assert.equal(normalizeSidBucket('a/b'), null);
  assert.equal(normalizeSidBucket('A1B2C3D4'), null); // uppercase not allowed
  assert.equal(normalizeSidBucket('a1b2c3'), null);   // too short
  assert.equal(normalizeSidBucket('a1b2c3d4e'), null); // too long
});

// ---------------------------------------------------------------------------
// readCurrentSid + resolveSid
// ---------------------------------------------------------------------------

test('readCurrentSid: returns shortened sid from state file', () => {
  const root = mkroot();
  try {
    mkdirSync(join(root, '.qe/state'), { recursive: true });
    writeFileSync(
      join(root, '.qe/state/current-session.json'),
      JSON.stringify({ session_id: 'abcdef12-3456-7890-1234-56789abcdef0' })
    );
    assert.equal(readCurrentSid(root), 'abcdef12');
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('readCurrentSid: returns null when state file missing', () => {
  const root = mkroot();
  try {
    assert.equal(readCurrentSid(root), null);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('readCurrentSid: returns null when JSON malformed', () => {
  const root = mkroot();
  try {
    mkdirSync(join(root, '.qe/state'), { recursive: true });
    writeFileSync(join(root, '.qe/state/current-session.json'), '{ broken');
    assert.equal(readCurrentSid(root), null);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('resolveSid: explicit override beats state file', () => {
  const root = mkroot();
  try {
    mkdirSync(join(root, '.qe/state'), { recursive: true });
    writeFileSync(
      join(root, '.qe/state/current-session.json'),
      JSON.stringify({ session_id: 'aaaaaaaa-1111-2222-3333-444444444444' })
    );
    assert.equal(resolveSid(root, 'bbbbbbbb'), 'bbbbbbbb');
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('resolveSid: falls back to _unknown bucket when nothing resolves', () => {
  const root = mkroot();
  try {
    assert.equal(resolveSid(root, null), '_unknown');
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('resolveSid: invalid override is ignored, state is used', () => {
  const root = mkroot();
  try {
    mkdirSync(join(root, '.qe/state'), { recursive: true });
    writeFileSync(
      join(root, '.qe/state/current-session.json'),
      JSON.stringify({ session_id: 'cafebabe-dead-beef-cafe-babebabebabe' })
    );
    assert.equal(resolveSid(root, '../escape'), 'cafebabe');
  } finally {
    rmSync(root, { recursive: true });
  }
});

// ---------------------------------------------------------------------------
// path helpers
// ---------------------------------------------------------------------------

test('getSessionContextDir / getSessionHandoffDir: build sessions/{sid} path', () => {
  const root = mkroot();
  try {
    const ctx = getSessionContextDir(root, 'a1b2c3d4');
    const hof = getSessionHandoffDir(root, 'a1b2c3d4');
    assert.equal(ctx, join(root, '.qe/context/sessions/a1b2c3d4'));
    assert.equal(hof, join(root, '.qe/handoffs/sessions/a1b2c3d4'));
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('ensureSessionDirs: creates both directories and returns resolved sid', () => {
  const root = mkroot();
  try {
    const result = ensureSessionDirs(root, 'a1b2c3d4');
    assert.equal(result.sid, 'a1b2c3d4');
    assert.ok(existsSync(result.contextDir));
    assert.ok(existsSync(result.handoffDir));
  } finally {
    rmSync(root, { recursive: true });
  }
});

// ---------------------------------------------------------------------------
// listSessionBuckets
// ---------------------------------------------------------------------------

test('listSessionBuckets: returns buckets sorted newest-first by mtime', async () => {
  const root = mkroot();
  try {
    const a = join(root, '.qe/context/sessions/a1b2c3d4');
    const b = join(root, '.qe/context/sessions/b1b2c3d4');
    mkdirSync(a, { recursive: true });
    mkdirSync(b, { recursive: true });
    writeFileSync(join(a, 'snapshot.md'), 'a');
    // small delay so b's mtime is strictly later
    await new Promise(r => setTimeout(r, 10));
    writeFileSync(join(b, 'snapshot.md'), 'b');

    const list = listSessionBuckets(root);
    assert.equal(list.length, 2);
    assert.equal(list[0].sid, 'b1b2c3d4');
    assert.equal(list[1].sid, 'a1b2c3d4');
    assert.ok(list[0].hasSnapshot);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('listSessionBuckets: skips invalid directory names', () => {
  const root = mkroot();
  try {
    mkdirSync(join(root, '.qe/context/sessions/NOPE'), { recursive: true });
    mkdirSync(join(root, '.qe/context/sessions/a1b2c3d4'), { recursive: true });
    writeFileSync(join(root, '.qe/context/sessions/a1b2c3d4/snapshot.md'), 'x');

    const list = listSessionBuckets(root);
    assert.equal(list.length, 1);
    assert.equal(list[0].sid, 'a1b2c3d4');
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('listSessionBuckets: returns empty array when sessions dir absent', () => {
  const root = mkroot();
  try {
    assert.deepEqual(listSessionBuckets(root), []);
  } finally {
    rmSync(root, { recursive: true });
  }
});
