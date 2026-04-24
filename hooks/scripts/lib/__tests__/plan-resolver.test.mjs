// Tests for plan-resolver slug caching.
// Strategy: mutate or delete the session file between calls. If the cache
// works, the second call still returns the original slug (no fs re-read).
// If the cache is broken, the change on disk leaks through.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  resolveActivePlanSlug,
  clearPlanResolverCache,
} from '../plan-resolver.mjs';

/**
 * Create an isolated tmp project root with `plans/{slug}/` and an empty
 * sessions dir so tests can bind sessions without touching real state.
 * @param {string} slug plan slug directory to create
 * @returns {string} absolute path to the tmp project root
 */
function makeFixture(slug) {
  const root = mkdtempSync(join(tmpdir(), 'plan-resolver-'));
  mkdirSync(join(root, '.qe/planning/plans', slug), { recursive: true });
  mkdirSync(join(root, '.qe/planning/.sessions'), { recursive: true });
  return root;
}

/**
 * Write a per-session binding file pointing the given session id at a slug.
 * @param {string} root project root returned by makeFixture
 * @param {string} sessionId Claude Code session identifier
 * @param {string} slug plan slug to bind
 */
function bindSession(root, sessionId, slug) {
  writeFileSync(
    join(root, '.qe/planning/.sessions', `${sessionId}.json`),
    JSON.stringify({ activePlanSlug: slug }),
  );
}

test('cache hit: resolver returns cached slug after session file is deleted', () => {
  clearPlanResolverCache();
  const root = makeFixture('demo');
  const sid = 'sess-hit';
  bindSession(root, sid, 'demo');
  try {
    const first = resolveActivePlanSlug(root, sid);
    assert.equal(first, 'demo');

    // Simulate fs change that a cache-less reader would pick up.
    unlinkSync(join(root, '.qe/planning/.sessions', `${sid}.json`));

    const second = resolveActivePlanSlug(root, sid);
    assert.equal(second, 'demo', 'second call should serve from cache');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('clearPlanResolverCache forces a fresh fs read', () => {
  clearPlanResolverCache();
  const root = makeFixture('demo');
  const sid = 'sess-clear';
  bindSession(root, sid, 'demo');
  try {
    assert.equal(resolveActivePlanSlug(root, sid), 'demo');

    unlinkSync(join(root, '.qe/planning/.sessions', `${sid}.json`));
    clearPlanResolverCache();

    assert.equal(
      resolveActivePlanSlug(root, sid),
      null,
      'after clear, missing session file should miss',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('different session ids cache independently', () => {
  clearPlanResolverCache();
  const root = makeFixture('demo');
  try {
    // Session A binds to demo; Session B has no binding.
    bindSession(root, 'sess-a', 'demo');

    assert.equal(resolveActivePlanSlug(root, 'sess-a'), 'demo');
    assert.equal(resolveActivePlanSlug(root, 'sess-b'), null);

    // Now add a binding for sess-b. A cacheless reader would see it; our
    // cache must keep the null verdict until it is explicitly cleared.
    bindSession(root, 'sess-b', 'demo');

    assert.equal(
      resolveActivePlanSlug(root, 'sess-b'),
      null,
      'cached null verdict for sess-b must stick',
    );
    assert.equal(
      resolveActivePlanSlug(root, 'sess-a'),
      'demo',
      'sess-a cache entry must be untouched',
    );

    clearPlanResolverCache();
    assert.equal(resolveActivePlanSlug(root, 'sess-b'), 'demo');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
