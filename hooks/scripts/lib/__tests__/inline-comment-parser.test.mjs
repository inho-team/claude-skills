import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { extractDirectives } from '../inline-comment-parser.mjs';

// ============================================================================
// HELPER: Create temp file with cleanup
// ============================================================================

function createTempFile(content) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-comment-parser-'));
  const filePath = path.join(tmpDir, 'test.tsx');
  fs.writeFileSync(filePath, content, 'utf8');
  return { filePath, tmpDir };
}

function cleanupTempFile(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ============================================================================
// TEST SUITE
// ============================================================================

test('Single directive followed by code', () => {
  const { filePath, tmpDir } = createTempFile(`<!-- claude: make this compact -->
<div>content</div>`);

  try {
    const results = extractDirectives(filePath);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].directive, 'make this compact');
    assert.strictEqual(results[0].targetLine, 2);
    assert.strictEqual(results[0].file, filePath);
  } finally {
    cleanupTempFile(tmpDir);
  }
});

test('Multiple directives on different lines', () => {
  const { filePath, tmpDir } = createTempFile(`<!-- claude: make compact -->
<div>content 1</div>

<!-- claude: use primary color -->
<section>content 2</section>

<!-- claude: add padding -->
<span>content 3</span>`);

  try {
    const results = extractDirectives(filePath);
    assert.strictEqual(results.length, 3);

    assert.strictEqual(results[0].directive, 'make compact');
    assert.strictEqual(results[0].targetLine, 2);

    assert.strictEqual(results[1].directive, 'use primary color');
    assert.strictEqual(results[1].targetLine, 5);

    assert.strictEqual(results[2].directive, 'add padding');
    assert.strictEqual(results[2].targetLine, 8);

    // All should reference the same file
    assert.strictEqual(results[0].file, filePath);
    assert.strictEqual(results[1].file, filePath);
    assert.strictEqual(results[2].file, filePath);
  } finally {
    cleanupTempFile(tmpDir);
  }
});

test('Non-lowercase-claude comments ignored', () => {
  const { filePath, tmpDir } = createTempFile(`<!-- claude: foo -->
<div>content 1</div>

<!-- regular comment -->
<div>content 2</div>

<!-- Claude: bar -->
<div>content 3</div>`);

  try {
    const results = extractDirectives(filePath);
    // Only lowercase 'claude:' is recognized
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].directive, 'foo');
  } finally {
    cleanupTempFile(tmpDir);
  }
});

test('Multi-line directive with newlines', () => {
  const { filePath, tmpDir } = createTempFile(`<!-- claude: make this more
     compact and modern -->
<section>content</section>`);

  try {
    const results = extractDirectives(filePath);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].directive, 'make this more compact and modern');
    // Multi-line comment spans lines 1-2, so targetLine is 3
    assert.strictEqual(results[0].targetLine, 2);
    assert.strictEqual(results[0].file, filePath);
  } finally {
    cleanupTempFile(tmpDir);
  }
});

test('File does not exist returns empty array', () => {
  const results = extractDirectives('/nonexistent/path/file.tsx');
  assert.deepStrictEqual(results, []);
});

test('No directives in file', () => {
  const { filePath, tmpDir } = createTempFile(`<div>content</div>
<section>more content</section>
<!-- just a regular comment -->
<span>final</span>`);

  try {
    const results = extractDirectives(filePath);
    assert.deepStrictEqual(results, []);
  } finally {
    cleanupTempFile(tmpDir);
  }
});

test('Directive followed by empty lines and then code', () => {
  const { filePath, tmpDir } = createTempFile(`<!-- claude: optimize this -->

<div>content</div>`);

  try {
    const results = extractDirectives(filePath);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].directive, 'optimize this');
    // Should skip empty line and find the div on line 3
    assert.strictEqual(results[0].targetLine, 3);
  } finally {
    cleanupTempFile(tmpDir);
  }
});

test('Directive followed by other comments before code', () => {
  const { filePath, tmpDir } = createTempFile(`<!-- claude: refactor -->
<!-- another comment -->
// JavaScript comment
<div>actual code</div>`);

  try {
    const results = extractDirectives(filePath);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].directive, 'refactor');
    // Should skip comments and find the div
    assert.strictEqual(results[0].targetLine, 4);
  } finally {
    cleanupTempFile(tmpDir);
  }
});

test('Directive with extra whitespace in content', () => {
  const { filePath, tmpDir } = createTempFile(`<!-- claude:   make   this   spaced   -->
<div>content</div>`);

  try {
    const results = extractDirectives(filePath);
    assert.strictEqual(results.length, 1);
    // Normalizer preserves internal spaces, trims outer, joins multiline with single space
    assert.strictEqual(results[0].directive, 'make   this   spaced');
  } finally {
    cleanupTempFile(tmpDir);
  }
});

test('Multiple consecutive directives', () => {
  const { filePath, tmpDir } = createTempFile(`<!-- claude: add style -->
<!-- claude: make responsive -->
<div>content</div>`);

  try {
    const results = extractDirectives(filePath);
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].directive, 'add style');
    assert.strictEqual(results[0].targetLine, 3);
    assert.strictEqual(results[1].directive, 'make responsive');
    assert.strictEqual(results[1].targetLine, 3);
  } finally {
    cleanupTempFile(tmpDir);
  }
});
