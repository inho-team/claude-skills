import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  computeContractHash,
  canonicalize
} from '../contract-hash.mjs';

import {
  readLock,
  writeLock,
  updateLockEntry,
  removeLockEntry,
  verifyLock
} from '../contract-lock.mjs';

/**
 * Create a temporary directory for test isolation.
 */
function makeTempDir() {
  return mkdtempSync(path.join(tmpdir(), 'contract-lock-test-'));
}

// ============================================================================
// contract-hash.mjs tests
// ============================================================================

test('contract-hash: computeContractHash returns sha256: prefix + 64 hex chars', () => {
  const hash = computeContractHash('hello');
  assert.match(hash, /^sha256:[a-f0-9]{64}$/);
});

test('contract-hash: CRLF vs LF normalization', () => {
  const crlfHash = computeContractHash('a\r\nb\r\n');
  const lfHash = computeContractHash('a\nb\n');
  assert.strictEqual(crlfHash, lfHash, 'CRLF and LF should produce same hash');
});

test('contract-hash: trailing whitespace stripped', () => {
  const withSpaces = computeContractHash('a  \nb');
  const noSpaces = computeContractHash('a\nb');
  assert.strictEqual(withSpaces, noSpaces, 'trailing spaces should be stripped');
});

test('contract-hash: trailing newlines collapsed', () => {
  const multiNewlines = computeContractHash('a\n\n\n');
  const singleNewline = computeContractHash('a\n');
  assert.strictEqual(multiNewlines, singleNewline, 'multiple trailing newlines should collapse to one');
});

test('contract-hash: determinism (5 calls same input)', () => {
  const input = 'test content with multiple lines\nand some trailing spaces  \n';
  const hashes = [1, 2, 3, 4, 5].map(() => computeContractHash(input));
  const first = hashes[0];
  hashes.forEach(h => {
    assert.strictEqual(h, first, 'all hashes should be identical');
  });
});

test('contract-hash: different inputs produce different hashes', () => {
  const hash1 = computeContractHash('input1');
  const hash2 = computeContractHash('input2');
  assert.notStrictEqual(hash1, hash2, 'different inputs must produce different hashes');
});

test('contract-hash: non-string input throws TypeError', () => {
  assert.throws(
    () => computeContractHash(null),
    TypeError,
    'null should throw TypeError'
  );
  assert.throws(
    () => computeContractHash(123),
    TypeError,
    'number should throw TypeError'
  );
  assert.throws(
    () => computeContractHash({}),
    TypeError,
    'object should throw TypeError'
  );
});

test('contract-hash: canonicalize produces exact form', () => {
  const canonical = canonicalize('a\r\nb');
  assert.strictEqual(canonical, 'a\nb\n', 'canonicalize should return "a\\nb\\n"');
});

// ============================================================================
// contract-lock.mjs tests
// ============================================================================

test('contract-lock: readLock returns {} when file missing', () => {
  const tempDir = makeTempDir();
  try {
    const lock = readLock(tempDir);
    assert.deepStrictEqual(lock, {}, 'should return empty object when lock file missing');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('contract-lock: updateLockEntry creates entry with hash, approved_at, reason', () => {
  const tempDir = makeTempDir();
  try {
    const entry = updateLockEntry('foo', 'sha256:abc', 'bootstrap', tempDir);

    assert.strictEqual(entry.hash, 'sha256:abc', 'hash should match input');
    assert.strictEqual(entry.reason, 'bootstrap', 'reason should match input');
    assert.ok(entry.approved_at, 'approved_at should be set');

    // Verify it's an ISO string
    const date = new Date(entry.approved_at);
    assert.ok(!isNaN(date.getTime()), 'approved_at should be valid ISO string');

    // Verify it's in lock file
    const lock = readLock(tempDir);
    assert.ok('foo' in lock, 'foo should be in lock');
    assert.strictEqual(lock.foo.hash, 'sha256:abc');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('contract-lock: multiple entries coexist', () => {
  const tempDir = makeTempDir();
  try {
    updateLockEntry('foo', 'sha256:111', 'reason1', tempDir);
    updateLockEntry('bar', 'sha256:222', 'reason2', tempDir);

    const lock = readLock(tempDir);
    assert.ok('foo' in lock, 'foo should be in lock');
    assert.ok('bar' in lock, 'bar should be in lock');
    assert.strictEqual(lock.foo.hash, 'sha256:111');
    assert.strictEqual(lock.bar.hash, 'sha256:222');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('contract-lock: removeLockEntry returns true and removes entry', () => {
  const tempDir = makeTempDir();
  try {
    updateLockEntry('foo', 'sha256:abc', 'bootstrap', tempDir);
    updateLockEntry('bar', 'sha256:def', 'other', tempDir);

    const removed = removeLockEntry('foo', tempDir);
    assert.strictEqual(removed, true, 'should return true when removing existing entry');

    const lock = readLock(tempDir);
    assert.ok(!('foo' in lock), 'foo should be removed');
    assert.ok('bar' in lock, 'bar should still exist');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('contract-lock: removeLockEntry returns false for nonexistent entry', () => {
  const tempDir = makeTempDir();
  try {
    const removed = removeLockEntry('nonexistent', tempDir);
    assert.strictEqual(removed, false, 'should return false for nonexistent entry');

    const lock = readLock(tempDir);
    assert.deepStrictEqual(lock, {}, 'lock should remain unchanged');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('contract-lock: verifyLock returns unapproved for unknown entry', () => {
  const tempDir = makeTempDir();
  try {
    const result = verifyLock('unknown', 'text', tempDir);
    assert.deepStrictEqual(result, { status: 'unapproved' });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('contract-lock: verifyLock returns match when hash matches', () => {
  const tempDir = makeTempDir();
  try {
    const content = 'hello\n';
    const hash = computeContractHash(content);

    updateLockEntry('foo', hash, 'test approval', tempDir);
    const result = verifyLock('foo', content, tempDir);

    assert.deepStrictEqual(result, { status: 'match' });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('contract-lock: verifyLock returns mismatch with expected/actual', () => {
  const tempDir = makeTempDir();
  try {
    const approved = 'hello\n';
    const actual = 'goodbye\n';
    const approvedHash = computeContractHash(approved);

    updateLockEntry('foo', approvedHash, 'test approval', tempDir);
    const result = verifyLock('foo', actual, tempDir);

    assert.strictEqual(result.status, 'mismatch');
    assert.strictEqual(result.expected, approvedHash);
    assert.ok(result.actual);
    assert.strictEqual(result.actual, computeContractHash(actual));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('contract-lock: verifyLock CRLF variant matches (canonicalization)', () => {
  const tempDir = makeTempDir();
  try {
    const approved = 'hello\n';
    const variant = 'hello\r\n';
    const hash = computeContractHash(approved);

    updateLockEntry('foo', hash, 'test approval', tempDir);
    const result = verifyLock('foo', variant, tempDir);

    assert.deepStrictEqual(result, { status: 'match' }, 'CRLF variant should match due to canonicalization');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('contract-lock: reason truncation to 500 chars max', () => {
  const tempDir = makeTempDir();
  try {
    const longReason = 'x'.repeat(1000);
    const entry = updateLockEntry('big', 'sha256:zzz', longReason, tempDir);

    assert.ok(entry.reason.length <= 500, `reason should be <= 500 chars, got ${entry.reason.length}`);
    assert.strictEqual(entry.reason, 'x'.repeat(500));

    // Verify in lock file
    const lock = readLock(tempDir);
    assert.strictEqual(lock.big.reason.length, 500);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
