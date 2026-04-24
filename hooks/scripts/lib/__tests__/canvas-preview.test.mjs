import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildPlan } from '../canvas-preview.mjs';

// ============================================================================
// TEST SETUP HELPERS
// ============================================================================

/**
 * Create a temporary directory with optional package.json.
 * Returns the directory path.
 */
function createTempProject(packageJsonContent = null) {
  const tempDir = mkdtempSync(join(tmpdir(), 'canvas-preview-test-'));

  if (packageJsonContent) {
    const packageJsonPath = join(tempDir, 'package.json');
    writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2));
  }

  return tempDir;
}

/**
 * Clean up temporary directory.
 */
function cleanupTempProject(tempDir) {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================================
// CASE 1: STATIC HTML FILE
// ============================================================================

test('Case 1: static HTML file (.html)', () => {
  // No projectRoot required, just detect .html extension
  const result = buildPlan('/tmp/foo.html');

  assert.strictEqual(result.framework, 'static');
  assert.strictEqual(result.url, 'file:///tmp/foo.html');
  assert.strictEqual(result.waitFor, 'load');
  assert.strictEqual(result.port, undefined);
});

test('Case 1: static HTML file (.htm)', () => {
  const result = buildPlan('/tmp/index.htm');

  assert.strictEqual(result.framework, 'static');
  assert.strictEqual(result.url, 'file:///tmp/index.htm');
  assert.strictEqual(result.waitFor, 'load');
  assert.strictEqual(result.port, undefined);
});

// ============================================================================
// CASE 2: VITE PROJECT
// ============================================================================

test('Case 2: vite project (devDependencies)', () => {
  const tempDir = createTempProject({
    devDependencies: {
      vite: '^5.0.0',
      '@vitejs/plugin-vue': '^4.0.0'
    }
  });

  try {
    const filePath = join(tempDir, 'src', 'App.tsx');
    const result = buildPlan(filePath, tempDir);

    assert.strictEqual(result.framework, 'vite');
    assert.strictEqual(result.port, 5173);
    assert.strictEqual(result.url, 'http://localhost:5173');
    assert.strictEqual(result.waitFor, 'networkidle');
  } finally {
    cleanupTempProject(tempDir);
  }
});

test('Case 2: vite project with absolute path', () => {
  const tempDir = createTempProject({
    devDependencies: {
      vite: '^5.1.0'
    }
  });

  try {
    const result = buildPlan('/some/absolute/path.tsx', tempDir);

    assert.strictEqual(result.framework, 'vite');
    assert.strictEqual(result.port, 5173);
  } finally {
    cleanupTempProject(tempDir);
  }
});

// ============================================================================
// CASE 3: NEXT.JS PROJECT
// ============================================================================

test('Case 3: next project (dependencies)', () => {
  const tempDir = createTempProject({
    dependencies: {
      next: '^14.0.0',
      react: '^18.0.0'
    }
  });

  try {
    const filePath = join(tempDir, 'app', 'page.tsx');
    const result = buildPlan(filePath, tempDir);

    assert.strictEqual(result.framework, 'next');
    assert.strictEqual(result.port, 3000);
    assert.strictEqual(result.url, 'http://localhost:3000');
    assert.strictEqual(result.waitFor, 'networkidle');
  } finally {
    cleanupTempProject(tempDir);
  }
});

test('Case 3: next project with higher version', () => {
  const tempDir = createTempProject({
    dependencies: {
      next: '^15.0.0',
      react: '^19.0.0'
    }
  });

  try {
    const result = buildPlan(join(tempDir, 'pages', 'index.js'), tempDir);

    assert.strictEqual(result.framework, 'next');
    assert.strictEqual(result.port, 3000);
  } finally {
    cleanupTempProject(tempDir);
  }
});

// ============================================================================
// CASE 4: NO FRAMEWORK (FALLBACK)
// ============================================================================

test('Case 4: no framework with no package.json', () => {
  const tempDir = createTempProject(null);

  try {
    const filePath = join(tempDir, 'x.tsx');
    const result = buildPlan(filePath, tempDir);

    assert.strictEqual(result.framework, 'none');
    assert.strictEqual(result.fallback, 'file-path-only');
    assert.strictEqual(result.url.startsWith('file://'), true);
    assert.strictEqual(result.waitFor, 'load');
    assert.strictEqual(result.port, undefined);
  } finally {
    cleanupTempProject(tempDir);
  }
});

test('Case 4: no framework with empty package.json', () => {
  const tempDir = createTempProject({});

  try {
    const filePath = join(tempDir, 'standalone.jsx');
    const result = buildPlan(filePath, tempDir);

    assert.strictEqual(result.framework, 'none');
    assert.strictEqual(result.fallback, 'file-path-only');
    assert.strictEqual(result.waitFor, 'load');
  } finally {
    cleanupTempProject(tempDir);
  }
});

test('Case 4: no framework with unrelated dependencies', () => {
  const tempDir = createTempProject({
    dependencies: {
      lodash: '^4.17.0',
      axios: '^1.0.0'
    }
  });

  try {
    const result = buildPlan(join(tempDir, 'utils.ts'), tempDir);

    assert.strictEqual(result.framework, 'none');
    assert.strictEqual(result.fallback, 'file-path-only');
  } finally {
    cleanupTempProject(tempDir);
  }
});

// ============================================================================
// BONUS CASE 5: CREATE REACT APP PROJECT
// ============================================================================

test('Case 5 (Bonus): CRA project (react-scripts)', () => {
  const tempDir = createTempProject({
    dependencies: {
      'react-scripts': '^5.0.0',
      react: '^18.0.0',
      'react-dom': '^18.0.0'
    }
  });

  try {
    const filePath = join(tempDir, 'src', 'App.js');
    const result = buildPlan(filePath, tempDir);

    assert.strictEqual(result.framework, 'cra');
    assert.strictEqual(result.port, 3000);
    assert.strictEqual(result.url, 'http://localhost:3000');
    assert.strictEqual(result.waitFor, 'networkidle');
  } finally {
    cleanupTempProject(tempDir);
  }
});

// ============================================================================
// PRIORITY/PRECEDENCE TESTS
// ============================================================================

test('Priority: next takes precedence over CRA (both present)', () => {
  const tempDir = createTempProject({
    dependencies: {
      next: '^14.0.0',
      'react-scripts': '^5.0.0',
      react: '^18.0.0'
    }
  });

  try {
    const result = buildPlan(join(tempDir, 'app', 'layout.tsx'), tempDir);

    // next should be detected first
    assert.strictEqual(result.framework, 'next');
  } finally {
    cleanupTempProject(tempDir);
  }
});

test('Priority: vite in devDependencies is checked after next/dependencies', () => {
  const tempDir = createTempProject({
    dependencies: {
      // no next, no react-scripts
    },
    devDependencies: {
      vite: '^5.0.0'
    }
  });

  try {
    const result = buildPlan(join(tempDir, 'src', 'App.tsx'), tempDir);

    assert.strictEqual(result.framework, 'vite');
  } finally {
    cleanupTempProject(tempDir);
  }
});

// ============================================================================
// EDGE CASES
// ============================================================================

test('Edge case: .HTML (uppercase) is detected', () => {
  const result = buildPlan('/tmp/Page.HTML');

  assert.strictEqual(result.framework, 'static');
  assert.ok(result.url.includes('Page.HTML'));
});

test('Edge case: relative path without projectRoot defaults to process.cwd()', () => {
  // This will resolve relative to process.cwd() (the project root)
  const result = buildPlan('./test.html');

  assert.strictEqual(result.framework, 'static');
  assert.ok(result.url.startsWith('file://'));
});

test('Edge case: malformed package.json is treated as missing', () => {
  const tempDir = createTempProject(null);

  try {
    // Write invalid JSON
    const packageJsonPath = join(tempDir, 'package.json');
    writeFileSync(packageJsonPath, 'not valid json {]');

    const result = buildPlan(join(tempDir, 'app.tsx'), tempDir);

    // Should fall back to 'none' framework
    assert.strictEqual(result.framework, 'none');
    assert.strictEqual(result.fallback, 'file-path-only');
  } finally {
    cleanupTempProject(tempDir);
  }
});

test('Edge case: file extension is lowercased for matching', () => {
  const tempDir = createTempProject({
    devDependencies: {
      vite: '^5.0.0'
    }
  });

  try {
    const result = buildPlan(join(tempDir, 'src', 'App.TSX'), tempDir);

    // Should still detect vite despite uppercase extension
    assert.strictEqual(result.framework, 'vite');
  } finally {
    cleanupTempProject(tempDir);
  }
});

test('Edge case: package.json with null dependencies object', () => {
  const tempDir = createTempProject({
    dependencies: null,
    devDependencies: null
  });

  try {
    const result = buildPlan(join(tempDir, 'app.tsx'), tempDir);

    assert.strictEqual(result.framework, 'none');
  } finally {
    cleanupTempProject(tempDir);
  }
});
