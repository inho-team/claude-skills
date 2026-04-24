import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scan } from '../design-scanner.mjs';

// ============================================================================
// CASE 1: Project with tailwind.config.js containing colors, spacing, fontFamily
// ============================================================================

test('Scanner: project with tailwind.config.js (colors, spacing, fontFamily) extracts all three token blocks', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-scanner-'));

  try {
    const tailwindConfig = `
module.exports = {
  content: ['./src/**/*.{jsx,tsx}'],
  theme: {
    colors: {
      primary: '#0066cc',
      secondary: '#ff6b35',
      white: '#ffffff',
    },
    spacing: {
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    },
    fontFamily: {
      sans: 'Inter, sans-serif',
      mono: 'Courier, monospace',
    },
  },
};
`;

    fs.writeFileSync(path.join(tmpDir, 'tailwind.config.js'), tailwindConfig);

    const result = scan(tmpDir);

    // Verify structure
    assert.ok(result.tokens, 'tokens object exists');
    assert.ok(result.tokens.colors, 'tokens.colors exists');
    assert.ok(result.tokens.spacing, 'tokens.spacing exists');
    assert.ok(result.tokens.typography, 'tokens.typography exists');
    assert.ok(Array.isArray(result.implicit), 'implicit is an array');

    // Verify colors extracted
    assert.ok(Object.keys(result.tokens.colors).length > 0, 'colors non-empty');
    assert.ok(result.tokens.colors.primary, 'primary color found');
    assert.ok(result.tokens.colors.secondary, 'secondary color found');

    // Verify spacing extracted
    assert.ok(Object.keys(result.tokens.spacing).length > 0, 'spacing non-empty');
    assert.ok(result.tokens.spacing.sm, 'sm spacing found');
    assert.ok(result.tokens.spacing.md, 'md spacing found');

    // Verify typography extracted
    assert.ok(Object.keys(result.tokens.typography).length > 0, 'typography non-empty');
    assert.ok(result.tokens.typography.sans, 'sans fontFamily found');
    assert.ok(result.tokens.typography.mono, 'mono fontFamily found');
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

// ============================================================================
// CASE 2: Project with no tailwind config
// ============================================================================

test('Scanner: project with no tailwind config returns empty token objects', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-scanner-'));

  try {
    // Create an empty project with no tailwind config
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');

    const result = scan(tmpDir);

    // Verify structure
    assert.ok(result.tokens, 'tokens object exists');
    assert.ok(result.tokens.colors, 'tokens.colors exists');
    assert.ok(result.tokens.spacing, 'tokens.spacing exists');
    assert.ok(result.tokens.typography, 'tokens.typography exists');
    assert.ok(Array.isArray(result.implicit), 'implicit is an array');

    // Verify all tokens are empty objects
    assert.deepStrictEqual(result.tokens.colors, {}, 'colors is empty object');
    assert.deepStrictEqual(result.tokens.spacing, {}, 'spacing is empty object');
    assert.deepStrictEqual(result.tokens.typography, {}, 'typography is empty object');
    assert.deepStrictEqual(result.implicit, [], 'implicit is empty array');
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

// ============================================================================
// CASE 3: Project with tailwind theme.extend block
// ============================================================================

test('Scanner: tailwind.config.mjs with theme.extend.colors extracts extended colors', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-scanner-'));

  try {
    const tailwindConfig = `
export default {
  content: ['./src/**/*.{jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#f00',
        accent: '#00f',
      },
      spacing: {
        '5xl': '3.5rem',
      },
    },
  },
};
`;

    fs.writeFileSync(path.join(tmpDir, 'tailwind.config.mjs'), tailwindConfig);

    const result = scan(tmpDir);

    // Verify structure
    assert.ok(result.tokens, 'tokens object exists');
    assert.ok(result.tokens.colors, 'tokens.colors exists');

    // The scanner should extract extended colors
    // Note: May extract from extend block or root level depending on implementation
    assert.ok(
      Object.keys(result.tokens.colors).length > 0 ||
      result.tokens.colors.brand ||
      result.tokens.colors.accent,
      'colors extracted (either root or extend)'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

// ============================================================================
// CASE 4: Components folder with repeated className usage → implicit tokens
// ============================================================================

test('Scanner: component files with high-frequency className tokens extracts implicit tokens', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-scanner-'));

  try {
    // Create src directory
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    // Create 3 component files with repeated className patterns
    const component1 = `
export function Card() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded">
      <p className="flex items-center gap-4">Content</p>
    </div>
  );
}
`;

    const component2 = `
export function Button() {
  return (
    <button className="flex items-center gap-4 px-4 py-2">
      <span className="flex items-center gap-4">Click me</span>
    </button>
  );
}
`;

    const component3 = `
export function Badge() {
  return (
    <span className="flex items-center gap-4 inline-block">
      <em className="flex items-center gap-4">Badge</em>
    </span>
  );
}
`;

    fs.writeFileSync(path.join(srcDir, 'Card.tsx'), component1);
    fs.writeFileSync(path.join(srcDir, 'Button.tsx'), component2);
    fs.writeFileSync(path.join(srcDir, 'Badge.tsx'), component3);

    const result = scan(tmpDir);

    // Verify structure
    assert.ok(Array.isArray(result.implicit), 'implicit is an array');

    // Verify high-frequency tokens appear in implicit list
    // 'flex', 'items-center', and 'gap-4' appear most frequently (10 times each)
    const implicitTokens = result.implicit.join(' ');
    assert.ok(implicitTokens.includes('flex') || result.implicit.includes('flex'), 'flex appears in implicit tokens');
    assert.ok(
      implicitTokens.includes('items-center') || result.implicit.includes('items-center'),
      'items-center appears in implicit tokens'
    );
    assert.ok(implicitTokens.includes('gap-4') || result.implicit.includes('gap-4'), 'gap-4 appears in implicit tokens');
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

// ============================================================================
// BONUS: Mixed config file formats
// ============================================================================

test('Scanner: attempts multiple config file formats (.js, .mjs, .cjs, .ts)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-scanner-'));

  try {
    const tailwindConfig = `
export default {
  theme: {
    colors: {
      primary: '#0066cc',
    },
  },
};
`;

    // Only write .mjs to test file format detection
    fs.writeFileSync(path.join(tmpDir, 'tailwind.config.mjs'), tailwindConfig);

    const result = scan(tmpDir);

    // Should find and parse the .mjs config
    assert.ok(result.tokens.colors.primary, 'config.mjs was successfully parsed');
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

// ============================================================================
// BONUS: Graceful handling of malformed config
// ============================================================================

test('Scanner: handles malformed tailwind config gracefully (no crash)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-scanner-'));

  try {
    const malformedConfig = `
This is not valid JavaScript at all!!!
{{{{{
colors: broken
~~~
`;

    fs.writeFileSync(path.join(tmpDir, 'tailwind.config.js'), malformedConfig);

    // Should not throw, just return default structure
    const result = scan(tmpDir);

    assert.ok(result.tokens, 'returns result even with malformed config');
    assert.ok(result.tokens.colors !== undefined, 'colors key exists');
    assert.ok(Array.isArray(result.implicit), 'implicit is array');
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

// ============================================================================
// BONUS: Component scanning with Vue/Svelte class attribute
// ============================================================================

test('Scanner: extracts className from Vue/Svelte class= attribute syntax', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-scanner-'));

  try {
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    const vueComponent = `
<template>
  <div class="flex items-center gap-4 p-4">
    <p class="flex items-center gap-4">Vue content</p>
  </div>
</template>
`;

    fs.writeFileSync(path.join(srcDir, 'VueComp.vue'), vueComponent);

    const result = scan(tmpDir);

    assert.ok(Array.isArray(result.implicit), 'implicit is an array');
    const implicitTokens = result.implicit.join(' ');
    // Should extract from both class= attributes
    assert.ok(
      implicitTokens.includes('flex') || result.implicit.includes('flex'),
      'class= attribute tokens extracted'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});
