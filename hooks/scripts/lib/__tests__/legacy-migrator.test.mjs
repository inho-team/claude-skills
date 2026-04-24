/**
 * legacy-migrator.test.mjs
 * Unit tests for the registry-driven legacy artifact migrator that runs
 * automatically at SessionStart and is also exposed via /Qmigrate-legacy.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  runAutoMigrations,
  summarizeReport,
  dryRunAll,
  applyById,
  listMigrations,
} from '../legacy-migrator.mjs';

/**
 * Create an isolated temp project root for one test case. Each call returns
 * a unique directory under the OS tmpdir so parallel test cases never share
 * state; callers are responsible for `rmSync`-ing it in a finally block.
 *
 * @returns {string} absolute path to a fresh temp directory
 */
function mkroot() {
  return mkdtempSync(join(tmpdir(), 'legacy-migrator-'));
}

// ---------------------------------------------------------------------------
// listMigrations
// ---------------------------------------------------------------------------

test('listMigrations: returns the registry metadata, not the closures', () => {
  const list = listMigrations();
  assert.ok(list.length >= 2, 'expected at least context-flat + handoffs-flat');
  for (const entry of list) {
    assert.equal(typeof entry.id, 'string');
    assert.equal(typeof entry.description, 'string');
    assert.equal(typeof entry.autoEligible, 'boolean');
    assert.equal('scan' in entry, false, 'scan should not leak through public API');
  }
});

test('listMigrations: known ids are present', () => {
  const ids = listMigrations().map(m => m.id);
  assert.ok(ids.includes('context-flat'));
  assert.ok(ids.includes('handoffs-flat'));
});

// ---------------------------------------------------------------------------
// runAutoMigrations + summarizeReport
// ---------------------------------------------------------------------------

test('runAutoMigrations: archives flat context files into _legacy bucket', () => {
  const root = mkroot();
  try {
    mkdirSync(join(root, '.qe/context'), { recursive: true });
    writeFileSync(join(root, '.qe/context/snapshot.md'), '# old');
    writeFileSync(join(root, '.qe/context/decisions.md'), '## old');

    const report = runAutoMigrations(root);

    const ctx = report.find(r => r.id === 'context-flat');
    assert.ok(ctx, 'expected context-flat entry in report');
    assert.equal(ctx.moved.length, 2);
    assert.equal(existsSync(join(root, '.qe/context/snapshot.md')), false);
    assert.equal(
      readFileSync(join(root, '.qe/context/sessions/_legacy/snapshot.md'), 'utf8'),
      '# old'
    );
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('runAutoMigrations: archives flat HANDOFF_*.md, leaves unrelated files alone', () => {
  const root = mkroot();
  try {
    mkdirSync(join(root, '.qe/handoffs'), { recursive: true });
    writeFileSync(join(root, '.qe/handoffs/HANDOFF_20260101_1200.md'), 'h1');
    writeFileSync(join(root, '.qe/handoffs/HANDOFF_20260102_1200.md'), 'h2');
    writeFileSync(join(root, '.qe/handoffs/README.md'), 'unrelated');

    const report = runAutoMigrations(root);

    const handoffs = report.find(r => r.id === 'handoffs-flat');
    assert.ok(handoffs);
    assert.equal(handoffs.moved.length, 2);
    assert.ok(existsSync(join(root, '.qe/handoffs/README.md')), 'README must stay');
    assert.ok(existsSync(join(root, '.qe/handoffs/sessions/_legacy/HANDOFF_20260101_1200.md')));
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('runAutoMigrations: idempotent — second run reports no movement', () => {
  const root = mkroot();
  try {
    mkdirSync(join(root, '.qe/context'), { recursive: true });
    writeFileSync(join(root, '.qe/context/snapshot.md'), 'x');
    runAutoMigrations(root);

    const report = runAutoMigrations(root);
    assert.deepEqual(report, []);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('runAutoMigrations: empty project produces empty report', () => {
  const root = mkroot();
  try {
    assert.deepEqual(runAutoMigrations(root), []);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('runAutoMigrations: skips when destination already exists (no overwrite)', () => {
  const root = mkroot();
  try {
    mkdirSync(join(root, '.qe/context'), { recursive: true });
    writeFileSync(join(root, '.qe/context/snapshot.md'), 'new');
    mkdirSync(join(root, '.qe/context/sessions/_legacy'), { recursive: true });
    writeFileSync(join(root, '.qe/context/sessions/_legacy/snapshot.md'), 'pre-existing');

    const report = runAutoMigrations(root);
    const ctx = report.find(r => r.id === 'context-flat');
    assert.ok(ctx);
    assert.equal(ctx.moved.length, 0);
    assert.equal(ctx.skipped.length, 1);
    assert.match(ctx.skipped[0].reason, /destination exists/);
    // Pre-existing copy must be untouched.
    assert.equal(
      readFileSync(join(root, '.qe/context/sessions/_legacy/snapshot.md'), 'utf8'),
      'pre-existing'
    );
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('summarizeReport: returns null on empty report', () => {
  assert.equal(summarizeReport([]), null);
  assert.equal(summarizeReport(null), null);
});

test('summarizeReport: formats id:count pairs from movements', () => {
  const line = summarizeReport([
    { id: 'context-flat', moved: [{ src: 'a', dst: 'b' }, { src: 'c', dst: 'd' }], skipped: [] },
    { id: 'handoffs-flat', moved: [{ src: 'e', dst: 'f' }], skipped: [] },
  ]);
  assert.match(line, /Legacy artifacts archived/);
  assert.match(line, /context-flat:2/);
  assert.match(line, /handoffs-flat:1/);
});

test('summarizeReport: returns null when only skipped entries are present', () => {
  const line = summarizeReport([
    { id: 'context-flat', moved: [], skipped: [{ src: 'x', reason: 'destination exists' }] },
  ]);
  assert.equal(line, null);
});

// ---------------------------------------------------------------------------
// dryRunAll + applyById
// ---------------------------------------------------------------------------

test('dryRunAll: enumerates every migration with candidate lists, applies nothing', () => {
  const root = mkroot();
  try {
    mkdirSync(join(root, '.qe/context'), { recursive: true });
    writeFileSync(join(root, '.qe/context/snapshot.md'), 'x');

    const report = dryRunAll(root);
    const ctx = report.find(r => r.id === 'context-flat');
    assert.ok(ctx);
    assert.equal(ctx.candidates.length, 1);

    // Source must remain — dry run does not touch the filesystem.
    assert.ok(existsSync(join(root, '.qe/context/snapshot.md')));
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('applyById: runs only the named migration', () => {
  const root = mkroot();
  try {
    mkdirSync(join(root, '.qe/context'), { recursive: true });
    writeFileSync(join(root, '.qe/context/snapshot.md'), 'x');
    mkdirSync(join(root, '.qe/handoffs'), { recursive: true });
    writeFileSync(join(root, '.qe/handoffs/HANDOFF_20260101_1200.md'), 'y');

    const result = applyById(root, 'context-flat');
    assert.ok(result);
    assert.equal(result.moved.length, 1);

    // handoffs-flat candidates must remain — we only ran context-flat.
    assert.ok(existsSync(join(root, '.qe/handoffs/HANDOFF_20260101_1200.md')));
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('applyById: returns null for unknown id', () => {
  const root = mkroot();
  try {
    assert.equal(applyById(root, 'no-such-migration'), null);
  } finally {
    rmSync(root, { recursive: true });
  }
});
