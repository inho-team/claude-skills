import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getCachedVerdict,
  saveVerdict,
  computeSkillHash
} from '../mtest-cache.mjs';

/**
 * Build an isolated scratch repo with a single SKILL.md seeded at `skills/Demo/SKILL.md`.
 * Returns the base directory + the skill path relative to it.
 */
function makeScratch(content = '# Demo\nDescription: demo skill.\n') {
  const base = mkdtempSync(path.join(tmpdir(), 'mtest-cache-test-'));
  const skillDir = path.join(base, 'skills', 'Demo');
  mkdirSync(skillDir, { recursive: true });
  const skillPath = 'skills/Demo/SKILL.md';
  writeFileSync(path.join(base, skillPath), content, 'utf8');
  return { base, skillPath };
}

// ---------------------------------------------------------------------------
// Case 1 — miss: no cache file yet
// ---------------------------------------------------------------------------

test('getCachedVerdict returns null on cache miss (no entry yet)', () => {
  const { base, skillPath } = makeScratch();
  try {
    const result = getCachedVerdict(skillPath, base);
    assert.strictEqual(result, null, 'fresh cache must return null');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case 2 — hit: save then retrieve
// ---------------------------------------------------------------------------

test('saveVerdict + getCachedVerdict round-trip yields cache hit', () => {
  const { base, skillPath } = makeScratch();
  try {
    const { cachePath, content_hash } = saveVerdict(
      skillPath,
      { verdict: 'PASS', accuracy: 1.0 },
      base
    );

    // file is under .qe/mtest-cache/<hex>.json
    assert.ok(cachePath.includes(path.join('.qe', 'mtest-cache')), 'cache path must be under .qe/mtest-cache');
    assert.match(content_hash, /^sha256:[a-f0-9]{64}$/, 'content_hash must be sha256-hex');

    const hit = getCachedVerdict(skillPath, base);
    assert.ok(hit, 'expected cache hit');
    assert.strictEqual(hit.verdict, 'PASS');
    assert.strictEqual(hit.accuracy, 1.0);
    assert.strictEqual(hit.content_hash, content_hash);
    assert.strictEqual(hit.skill_path, skillPath);
    assert.match(hit.timestamp, /^\d{4}-\d{2}-\d{2}T/); // ISO-8601 shape
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case 3 — invalidation: SKILL.md changes → previous cache entry no longer hits
// ---------------------------------------------------------------------------

test('modifying SKILL.md invalidates the previous cache entry (miss on changed content)', () => {
  const { base, skillPath } = makeScratch('# Demo\nversion: 1\n');
  try {
    saveVerdict(skillPath, { verdict: 'PASS', accuracy: 1.0 }, base);

    // mutate the SKILL.md — the content-addressed hash key changes
    writeFileSync(path.join(base, skillPath), '# Demo\nversion: 2 — new triggers\n', 'utf8');

    const result = getCachedVerdict(skillPath, base);
    assert.strictEqual(result, null, 'edited SKILL.md must miss the prior hash');

    // Defence-in-depth check: the previous cache file still exists on disk but at
    // a different hash name — the new content would write a separate entry.
    const newHash = computeSkillHash(skillPath, base);
    const files = readdirSync(path.join(base, '.qe', 'mtest-cache'));
    const stripped = newHash.replace(/^sha256:/, '');
    assert.ok(
      !files.includes(`${stripped}.json`),
      'new-content hash file should not yet exist before re-saving'
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Bonus — invalid verdict shape is rejected (defence-in-depth, not one of 3 cases)
// ---------------------------------------------------------------------------

test('saveVerdict rejects unknown verdict enum', () => {
  const { base, skillPath } = makeScratch();
  try {
    assert.throws(
      () => saveVerdict(skillPath, { verdict: 'MAYBE', accuracy: 0.5 }, base),
      /verdict\.verdict must be one of/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('saveVerdict rejects accuracy outside [0, 1]', () => {
  const { base, skillPath } = makeScratch();
  try {
    assert.throws(
      () => saveVerdict(skillPath, { verdict: 'PASS', accuracy: 1.5 }, base),
      /accuracy/
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
