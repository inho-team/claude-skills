import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  readVerdict,
  writeVerdict,
  isCacheHit
} from '../contract-verdict-cache.mjs';

/**
 * Create a temporary directory for test isolation.
 */
function makeTempDir() {
  return mkdtempSync(path.join(tmpdir(), 'contract-verdict-test-'));
}

/**
 * Build a valid verdict object with optional overrides.
 */
function validVerdict(overrides = {}) {
  return {
    contract_hash: 'sha256:aaa',
    impl_hash: 'sha256:bbb',
    test_hash: 'sha256:ccc',
    verdict: 'PASS',
    summary: 'ok',
    findings: [],
    judged_at: '2026-04-22T00:00:00.000Z',
    model: 'claude-sonnet-4-6',
    ...overrides
  };
}

// ============================================================================
// readVerdict tests
// ============================================================================

test('readVerdict: returns null when no cache file exists for that name', () => {
  const tempDir = makeTempDir();
  try {
    const result = readVerdict('test-contract', tempDir);
    assert.strictEqual(result, null, 'should return null when file does not exist');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('readVerdict: returns parsed object when cache file exists', () => {
  const tempDir = makeTempDir();
  try {
    const verdict = validVerdict();
    writeVerdict('test-contract', verdict, tempDir);

    const result = readVerdict('test-contract', tempDir);
    assert.deepStrictEqual(result, verdict, 'should return the exact object written');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('readVerdict: throws on malformed JSON with message containing "Malformed"', () => {
  const tempDir = makeTempDir();
  try {
    // Create a verdicts directory and write malformed JSON directly
    const verdictsDir = path.join(tempDir, '.qe/contracts/.verdicts');
    mkdirSync(verdictsDir, { recursive: true });
    writeFileSync(path.join(verdictsDir, 'bad-contract.json'), '{invalid json}', 'utf8');

    assert.throws(
      () => readVerdict('bad-contract', tempDir),
      (err) => {
        assert.match(err.message, /Malformed/, 'error message should contain "Malformed"');
        return true;
      },
      'should throw error with "Malformed" in message'
    );
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('readVerdict: rejects invalid contract name (e.g., "TEMPLATE")', () => {
  const tempDir = makeTempDir();
  try {
    assert.throws(
      () => readVerdict('TEMPLATE', tempDir),
      (err) => {
        assert.match(err.message, /Invalid contract name/, 'error message should mention invalid name');
        return true;
      },
      'should reject reserved name TEMPLATE'
    );
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// writeVerdict tests
// ============================================================================

test('writeVerdict: round-trip (writeVerdict → readVerdict) returns exact object', () => {
  const tempDir = makeTempDir();
  try {
    const original = validVerdict();
    writeVerdict('test-contract', original, tempDir);

    const read = readVerdict('test-contract', tempDir);
    assert.deepStrictEqual(read, original, 'round-trip should preserve exact object');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('writeVerdict: creates .qe/contracts/.verdicts/ directory if missing', () => {
  const tempDir = makeTempDir();
  try {
    const verdict = validVerdict();
    writeVerdict('test-contract', verdict, tempDir);

    const verdictsDir = path.join(tempDir, '.qe/contracts/.verdicts');
    assert.ok(existsSync(verdictsDir), 'verdicts directory should be created');

    const verdictFile = path.join(verdictsDir, 'test-contract.json');
    assert.ok(existsSync(verdictFile), 'verdict file should exist');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('writeVerdict: rejects missing summary field', () => {
  const tempDir = makeTempDir();
  try {
    const badVerdict = validVerdict();
    delete badVerdict.summary;

    assert.throws(
      () => writeVerdict('test-contract', badVerdict, tempDir),
      (err) => {
        assert.match(err.message, /summary/, 'error should mention missing summary');
        return true;
      },
      'should reject when summary is missing'
    );
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('writeVerdict: rejects missing findings field', () => {
  const tempDir = makeTempDir();
  try {
    const badVerdict = validVerdict();
    delete badVerdict.findings;

    assert.throws(
      () => writeVerdict('test-contract', badVerdict, tempDir),
      (err) => {
        assert.match(err.message, /findings/, 'error should mention missing findings');
        return true;
      },
      'should reject when findings is missing'
    );
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('writeVerdict: rejects invalid verdict value (e.g., "MAYBE")', () => {
  const tempDir = makeTempDir();
  try {
    const badVerdict = validVerdict({ verdict: 'MAYBE' });

    assert.throws(
      () => writeVerdict('test-contract', badVerdict, tempDir),
      (err) => {
        assert.match(err.message, /verdict/, 'error should mention verdict');
        return true;
      },
      'should reject invalid verdict enum value'
    );
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('writeVerdict: rejects findings when not an array (e.g., findings: "abc")', () => {
  const tempDir = makeTempDir();
  try {
    const badVerdict = validVerdict({ findings: 'abc' });

    assert.throws(
      () => writeVerdict('test-contract', badVerdict, tempDir),
      (err) => {
        assert.match(err.message, /array/, 'error should mention array requirement');
        return true;
      },
      'should reject findings that is not an array'
    );
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('writeVerdict: rejects invalid contract name', () => {
  const tempDir = makeTempDir();
  try {
    const verdict = validVerdict();

    assert.throws(
      () => writeVerdict('__proto__', verdict, tempDir),
      (err) => {
        assert.match(err.message, /Invalid contract name/, 'error should mention invalid name');
        return true;
      },
      'should reject reserved name __proto__'
    );
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// isCacheHit tests
// ============================================================================

test('isCacheHit: returns false when no cache file exists', () => {
  const tempDir = makeTempDir();
  try {
    const result = isCacheHit('nonexistent-contract', {
      contract_hash: 'sha256:aaa',
      impl_hash: 'sha256:bbb',
      test_hash: 'sha256:ccc'
    }, tempDir);

    assert.strictEqual(result, false, 'should return false when cache file does not exist');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('isCacheHit: returns true when all 3 hashes match the cached entry', () => {
  const tempDir = makeTempDir();
  try {
    const verdict = validVerdict({
      contract_hash: 'sha256:hash1',
      impl_hash: 'sha256:hash2',
      test_hash: 'sha256:hash3'
    });
    writeVerdict('test-contract', verdict, tempDir);

    const result = isCacheHit('test-contract', {
      contract_hash: 'sha256:hash1',
      impl_hash: 'sha256:hash2',
      test_hash: 'sha256:hash3'
    }, tempDir);

    assert.strictEqual(result, true, 'should return true when all hashes match');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('isCacheHit: returns false when contract_hash differs', () => {
  const tempDir = makeTempDir();
  try {
    const verdict = validVerdict({
      contract_hash: 'sha256:hash1',
      impl_hash: 'sha256:hash2',
      test_hash: 'sha256:hash3'
    });
    writeVerdict('test-contract', verdict, tempDir);

    const result = isCacheHit('test-contract', {
      contract_hash: 'sha256:different',
      impl_hash: 'sha256:hash2',
      test_hash: 'sha256:hash3'
    }, tempDir);

    assert.strictEqual(result, false, 'should return false when contract_hash differs');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('isCacheHit: returns false when impl_hash differs', () => {
  const tempDir = makeTempDir();
  try {
    const verdict = validVerdict({
      contract_hash: 'sha256:hash1',
      impl_hash: 'sha256:hash2',
      test_hash: 'sha256:hash3'
    });
    writeVerdict('test-contract', verdict, tempDir);

    const result = isCacheHit('test-contract', {
      contract_hash: 'sha256:hash1',
      impl_hash: 'sha256:different',
      test_hash: 'sha256:hash3'
    }, tempDir);

    assert.strictEqual(result, false, 'should return false when impl_hash differs');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('isCacheHit: returns false when test_hash differs', () => {
  const tempDir = makeTempDir();
  try {
    const verdict = validVerdict({
      contract_hash: 'sha256:hash1',
      impl_hash: 'sha256:hash2',
      test_hash: 'sha256:hash3'
    });
    writeVerdict('test-contract', verdict, tempDir);

    const result = isCacheHit('test-contract', {
      contract_hash: 'sha256:hash1',
      impl_hash: 'sha256:hash2',
      test_hash: 'sha256:different'
    }, tempDir);

    assert.strictEqual(result, false, 'should return false when test_hash differs');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('isCacheHit: returns false on malformed JSON (graceful fallback)', () => {
  const tempDir = makeTempDir();
  try {
    // Create a verdicts directory and write malformed JSON directly
    const verdictsDir = path.join(tempDir, '.qe/contracts/.verdicts');
    mkdirSync(verdictsDir, { recursive: true });
    writeFileSync(path.join(verdictsDir, 'bad-contract.json'), '{invalid json}', 'utf8');

    // Should not throw, should return false gracefully
    const result = isCacheHit('bad-contract', {
      contract_hash: 'sha256:aaa',
      impl_hash: 'sha256:bbb',
      test_hash: 'sha256:ccc'
    }, tempDir);

    assert.strictEqual(result, false, 'should return false on malformed JSON instead of throwing');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('isCacheHit: rejects invalid contract name', () => {
  const tempDir = makeTempDir();
  try {
    assert.throws(
      () => isCacheHit('README', {
        contract_hash: 'sha256:aaa',
        impl_hash: 'sha256:bbb',
        test_hash: 'sha256:ccc'
      }, tempDir),
      (err) => {
        assert.match(err.message, /Invalid contract name/, 'error should mention invalid name');
        return true;
      },
      'should reject reserved name README'
    );
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

// ============================================================================
// Additional edge cases
// ============================================================================

test('writeVerdict: accepts valid verdict value "FAIL"', () => {
  const tempDir = makeTempDir();
  try {
    const verdict = validVerdict({ verdict: 'FAIL' });
    writeVerdict('test-contract', verdict, tempDir);

    const read = readVerdict('test-contract', tempDir);
    assert.strictEqual(read.verdict, 'FAIL', 'should accept and preserve FAIL verdict');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('writeVerdict: accepts empty findings array', () => {
  const tempDir = makeTempDir();
  try {
    const verdict = validVerdict({ findings: [] });
    writeVerdict('test-contract', verdict, tempDir);

    const read = readVerdict('test-contract', tempDir);
    assert.deepStrictEqual(read.findings, [], 'should accept and preserve empty findings array');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('writeVerdict: accepts findings array with objects', () => {
  const tempDir = makeTempDir();
  try {
    const findings = [
      { type: 'issue', message: 'problem 1' },
      { type: 'warning', message: 'problem 2' }
    ];
    const verdict = validVerdict({ findings });
    writeVerdict('test-contract', verdict, tempDir);

    const read = readVerdict('test-contract', tempDir);
    assert.deepStrictEqual(read.findings, findings, 'should accept and preserve findings array with objects');
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});

test('writeVerdict: rejects missing contract_hash field', () => {
  const tempDir = makeTempDir();
  try {
    const badVerdict = validVerdict();
    delete badVerdict.contract_hash;

    assert.throws(
      () => writeVerdict('test-contract', badVerdict, tempDir),
      (err) => {
        assert.match(err.message, /contract_hash/, 'error should mention contract_hash');
        return true;
      },
      'should reject when contract_hash is missing'
    );
  } finally {
    rmSync(tempDir, { recursive: true });
  }
});
