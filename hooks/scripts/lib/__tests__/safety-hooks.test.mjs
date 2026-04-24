#!/usr/bin/env node

/**
 * safety-hooks.test.mjs
 * Test suite for retry-counter.mjs, iteration-tracker.mjs, context-meter.mjs
 * Run with: node --test hooks/scripts/lib/__tests__/safety-hooks.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { recordFailure, getCount, resetCounter } from '../retry-counter.mjs';
import { recordIteration, getState, resetSession } from '../iteration-tracker.mjs';
import { estimateUsageRatio, recordBlock, getBlockCount, resetBlocks } from '../context-meter.mjs';

// ============================================================================
// retry-counter tests
// ============================================================================

test('retry-counter: happy path — recordFailure 4 times → count = 4', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const sig = 'cmd:build';
  recordFailure(sig, dir);
  recordFailure(sig, dir);
  recordFailure(sig, dir);
  recordFailure(sig, dir);
  assert.strictEqual(getCount(sig, dir), 4);
});

test('retry-counter: threshold — 5th recordFailure → count = 5', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const sig = 'cmd:test';
  for (let i = 0; i < 5; i++) recordFailure(sig, dir);
  assert.strictEqual(getCount(sig, dir), 5);
});

test('retry-counter: window expiry — windowStart > 1h ago resets count to 1', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const sig = 'cmd:lint';
  // Record 3 failures
  recordFailure(sig, dir);
  recordFailure(sig, dir);
  recordFailure(sig, dir);
  assert.strictEqual(getCount(sig, dir), 3);

  // Manually set windowStart to > 1 hour ago
  const countersFile = path.join(dir, 'retry-counters.json');
  const data = JSON.parse(fs.readFileSync(countersFile, 'utf8'));
  data[sig].windowStart = Math.floor(Date.now() / 1000) - 3700; // 3700s > 3600s
  fs.writeFileSync(countersFile, JSON.stringify(data, null, 2), 'utf8');

  // Next recordFailure should reset to 1
  const result = recordFailure(sig, dir);
  assert.strictEqual(result.count, 1);
  assert.strictEqual(getCount(sig, dir), 1);
});

test('retry-counter: different signatures do not interfere', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const sigA = 'cmd:build';
  const sigB = 'cmd:deploy';
  recordFailure(sigA, dir);
  recordFailure(sigA, dir);
  recordFailure(sigB, dir);

  assert.strictEqual(getCount(sigA, dir), 2);
  assert.strictEqual(getCount(sigB, dir), 1);
});

test('retry-counter: resetCounter clears the entry', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const sig = 'cmd:format';
  recordFailure(sig, dir);
  recordFailure(sig, dir);
  assert.strictEqual(getCount(sig, dir), 2);

  resetCounter(sig, dir);
  assert.strictEqual(getCount(sig, dir), 0);
});

// ============================================================================
// iteration-tracker tests
// ============================================================================

test('iteration-tracker: recordIteration increments count and updates lastActivity', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const sessionId = 'session-abc';
  const before = Math.floor(Date.now() / 1000);

  const r1 = recordIteration(sessionId, dir);
  assert.strictEqual(r1.count, 1);
  assert.ok(r1.lastActivity >= before);

  const r2 = recordIteration(sessionId, dir);
  assert.strictEqual(r2.count, 2);
  assert.ok(r2.lastActivity >= before);
});

test('iteration-tracker: multiple sessions do not collide', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const s1 = 'session-1';
  const s2 = 'session-2';
  recordIteration(s1, dir);
  recordIteration(s1, dir);
  recordIteration(s1, dir);
  recordIteration(s2, dir);

  assert.strictEqual(getState(s1, dir).count, 3);
  assert.strictEqual(getState(s2, dir).count, 1);
});

test('iteration-tracker: getState returns null for unknown session', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = getState('nonexistent-session', dir);
  assert.strictEqual(result, null);
});

test('iteration-tracker: resetSession clears the entry', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const sessionId = 'session-xyz';
  recordIteration(sessionId, dir);
  recordIteration(sessionId, dir);
  assert.strictEqual(getState(sessionId, dir).count, 2);

  resetSession(sessionId, dir);
  assert.strictEqual(getState(sessionId, dir), null);
});

// ============================================================================
// context-meter tests
// ============================================================================

test('context-meter: estimateUsageRatio with non-existent transcript path → 0', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const ratio = estimateUsageRatio(path.join(dir, 'no-such-file.jsonl'));
  assert.strictEqual(ratio, 0);
});

test('context-meter: recordBlock increments and persists across calls', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const sessionId = 'ctx-session';
  const c1 = recordBlock(sessionId, dir);
  assert.strictEqual(c1, 1);

  const c2 = recordBlock(sessionId, dir);
  assert.strictEqual(c2, 2);

  const c3 = recordBlock(sessionId, dir);
  assert.strictEqual(c3, 3);
});

test('context-meter: getBlockCount reflects current state', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const sessionId = 'ctx-session-2';
  assert.strictEqual(getBlockCount(sessionId, dir), 0);

  recordBlock(sessionId, dir);
  recordBlock(sessionId, dir);
  assert.strictEqual(getBlockCount(sessionId, dir), 2);
});

test('context-meter: resetBlocks clears the entry', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qe-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const sessionId = 'ctx-session-3';
  recordBlock(sessionId, dir);
  recordBlock(sessionId, dir);
  assert.strictEqual(getBlockCount(sessionId, dir), 2);

  resetBlocks(sessionId, dir);
  assert.strictEqual(getBlockCount(sessionId, dir), 0);
});
