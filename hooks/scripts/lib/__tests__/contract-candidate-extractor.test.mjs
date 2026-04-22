#!/usr/bin/env node
'use strict';

/**
 * Unit tests for contract-candidate-extractor.mjs
 * Tests hasAutoMarker() and extractCandidates() functions.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { hasAutoMarker, extractCandidates } from '../contract-candidate-extractor.mjs';

// ============================================================================
// hasAutoMarker tests
// ============================================================================

test('hasAutoMarker: returns true for basic marker', async (t) => {
  const text = 'text\n<!-- contract-candidates: auto -->\nmore';
  assert.equal(hasAutoMarker(text), true);
});

test('hasAutoMarker: returns true with inner whitespace', async (t) => {
  const text = '<!--  contract-candidates:   auto  -->';
  assert.equal(hasAutoMarker(text), true);
});

test('hasAutoMarker: returns false for markdown without marker', async (t) => {
  const text = '# Some task\n## Checklist\n- [ ] foo → output: src/foo.mjs';
  assert.equal(hasAutoMarker(text), false);
});

test('hasAutoMarker: returns false for null without throw', async (t) => {
  assert.equal(hasAutoMarker(null), false);
});

test('hasAutoMarker: returns false for undefined without throw', async (t) => {
  assert.equal(hasAutoMarker(undefined), false);
});

test('hasAutoMarker: returns false for number without throw', async (t) => {
  assert.equal(hasAutoMarker(123), false);
});

test('hasAutoMarker: returns false for object without throw', async (t) => {
  assert.equal(hasAutoMarker({}), false);
});

// ============================================================================
// extractCandidates: marker absent (opt-out is default)
// ============================================================================

test('extractCandidates: returns [] when marker absent', async (t) => {
  const text = '# Some task\n## 체크리스트\n- [ ] foo → output: src/foo.mjs';
  const result = extractCandidates(text);
  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 0);
});

test('extractCandidates: returns [] for null', async (t) => {
  const result = extractCandidates(null);
  assert.deepEqual(result, []);
});

test('extractCandidates: returns [] for undefined', async (t) => {
  const result = extractCandidates(undefined);
  assert.deepEqual(result, []);
});

test('extractCandidates: returns [] for number', async (t) => {
  const result = extractCandidates(123);
  assert.deepEqual(result, []);
});

// ============================================================================
// extractCandidates: marker present, Korean checklist
// ============================================================================

test('extractCandidates: extracts single candidate from Korean checklist', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] foo → output: src/foo.mjs
## Other Section`;
  const result = extractCandidates(text);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], {
    name: 'foo',
    targetPath: 'src/foo.mjs',
    suggestedSignature: '',
  });
});

test('extractCandidates: extracts multiple candidates preserving order', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] alpha → output: src/alpha.mjs
- [ ] beta → output: src/beta.mjs
- [ ] gamma → output: src/gamma.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 3);
  assert.equal(result[0].name, 'alpha');
  assert.equal(result[1].name, 'beta');
  assert.equal(result[2].name, 'gamma');
});

test('extractCandidates: deduplicates by name (first wins)', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] foo → output: src/foo.mjs
- [ ] other → output: src/foo.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'foo');
  assert.equal(result[0].targetPath, 'src/foo.mjs');
});

test('extractCandidates: sanitizes name (dots become hyphens)', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] test → output: src/foo.bar.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'foo-bar');
  assert.equal(result[0].targetPath, 'src/foo.bar.mjs');
});

// ============================================================================
// extractCandidates: marker present, English checklist
// ============================================================================

test('extractCandidates: extracts candidate from English checklist', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## Checklist
- [ ] foo → output: src/foo.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'foo');
});

// ============================================================================
// extractCandidates: filter rules (test files, non-.mjs)
// ============================================================================

test('extractCandidates: excludes __tests__ paths', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] tests → output: src/__tests__/foo.test.mjs`;
  const result = extractCandidates(text);
  assert.equal(result.length, 0);
});

test('extractCandidates: excludes .test.mjs files', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] tests → output: src/foo.test.mjs`;
  const result = extractCandidates(text);
  assert.equal(result.length, 0);
});

test('extractCandidates: includes non-test .mjs files', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] foo → output: src/foo.mjs
- [ ] bar → output: src/bar.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 2);
  assert.equal(result[0].name, 'foo');
  assert.equal(result[1].name, 'bar');
});

test('extractCandidates: excludes non-.mjs files', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] doc → output: README.md`;
  const result = extractCandidates(text);
  assert.equal(result.length, 0);
});

// ============================================================================
// extractCandidates: missing checklist section
// ============================================================================

test('extractCandidates: returns [] when marker present but no checklist section', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
Some content without a checklist.`;
  const result = extractCandidates(text);
  assert.equal(result.length, 0);
});

// ============================================================================
// extractCandidates: edge cases and marker variations
// ============================================================================

test('extractCandidates: handles marker with no checkbox items', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
Just some text, no checkboxes.`;
  const result = extractCandidates(text);
  assert.equal(result.length, 0);
});

test('extractCandidates: handles unchecked and checked checkboxes', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] unchecked → output: src/unchecked.mjs
- [x] checked → output: src/checked.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 2);
  assert.equal(result[0].name, 'unchecked');
  assert.equal(result[1].name, 'checked');
});

test('extractCandidates: ignores lines without checkbox syntax', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- foo → output: src/foo.mjs
- [ ] bar → output: src/bar.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'bar');
});

test('extractCandidates: stops parsing at next section heading', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] foo → output: src/foo.mjs
## Next Section
- [ ] bar → output: src/bar.mjs`;
  const result = extractCandidates(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'foo');
});

test('extractCandidates: handles mixed Korean and English checklist items', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] English foo → output: src/foo.mjs
- [ ] 한글 bar → output: src/bar.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 2);
});

test('extractCandidates: preserves deep nested paths', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] deep → output: src/nested/deeply/foo.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].targetPath, 'src/nested/deeply/foo.mjs');
  assert.equal(result[0].name, 'foo');
});

test('extractCandidates: handles marker with extra whitespace variations', async (t) => {
  const text = `# Task Request
<!--  contract-candidates:   auto  -->
## 체크리스트
- [ ] foo → output: src/foo.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'foo');
});

test('extractCandidates: case-insensitive checklist section matching', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## CHECKLIST
- [ ] foo → output: src/foo.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'foo');
});

test('extractCandidates: returns empty array for empty text', async (t) => {
  const result = extractCandidates('');
  assert.deepEqual(result, []);
});

test('extractCandidates: handles multiple sections with checklist', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] alpha → output: src/alpha.mjs
## Other Section
- [ ] beta → output: src/beta.mjs`;
  const result = extractCandidates(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'alpha');
});

test('extractCandidates: dedupe with different target paths, same basename', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] first → output: src/foo.mjs
- [ ] second → output: other/foo.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'foo');
  assert.equal(result[0].targetPath, 'src/foo.mjs');
});

test('extractCandidates: sanitizes special characters in name', async (t) => {
  const text = `# Task Request
<!-- contract-candidates: auto -->
## 체크리스트
- [ ] test → output: src/foobar.mjs
## Other`;
  const result = extractCandidates(text);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'foobar');
});
