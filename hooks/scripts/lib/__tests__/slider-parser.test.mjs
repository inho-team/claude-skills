import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSliders, serializeSlider, applyValues } from '../slider-parser.mjs';

// ============================================================================
// parseSliders TESTS
// ============================================================================

test('parseSliders: basic block with valid attributes extracts all 6 fields', () => {
  const markdown = `<!-- slider name="p" min=16 max=64 step=4 value=32 unit="px" -->padding: 32px;<!-- /slider -->`;

  const result = parseSliders(markdown);
  assert.strictEqual(result.length, 1);

  const slider = result[0];
  assert.strictEqual(slider.name, 'p');
  assert.strictEqual(slider.min, 16);
  assert.strictEqual(slider.max, 64);
  assert.strictEqual(slider.step, 4);
  assert.strictEqual(slider.value, 32);
  assert.strictEqual(slider.unit, 'px');
  assert.ok(slider.innerContent.includes('padding: 32px'));
});

test('parseSliders: multiple blocks parsed independently with distinct names', () => {
  const markdown = `
<!-- slider name="p1" min=10 max=50 step=5 value=25 unit="px" -->
padding: 25px;
<!-- /slider -->

<!-- slider name="p2" min=16 max=64 step=4 value=32 unit="em" -->
margin: 32em;
<!-- /slider -->
`;

  const result = parseSliders(markdown);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].name, 'p1');
  assert.strictEqual(result[1].name, 'p2');
  assert.strictEqual(result[0].unit, 'px');
  assert.strictEqual(result[1].unit, 'em');
});

test('parseSliders: malformed attribute (min=abc) skips block silently', () => {
  const markdown = `<!-- slider name="bad" min=abc max=50 step=5 value=25 unit="px" -->content<!-- /slider -->`;

  const result = parseSliders(markdown);
  assert.strictEqual(result.length, 0);
});

test('parseSliders: missing required attribute (no name) skips block silently', () => {
  const markdown = `<!-- slider min=10 max=50 step=5 value=25 unit="px" -->content<!-- /slider -->`;

  const result = parseSliders(markdown);
  assert.strictEqual(result.length, 0);
});

test('parseSliders: missing closing comment logs warning and skips block', () => {
  const markdown = `<!-- slider name="orphan" min=10 max=50 step=5 value=25 unit="px" -->content`;

  const result = parseSliders(markdown);
  assert.strictEqual(result.length, 0);
});

test('parseSliders: unit attribute optional, parses without unit', () => {
  const markdown = `<!-- slider name="nounit" min=10 max=50 step=5 value=25 -->content<!-- /slider -->`;

  const result = parseSliders(markdown);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].unit, '');
});

test('parseSliders: empty markdown returns empty array', () => {
  const result = parseSliders('');
  assert.strictEqual(result.length, 0);
});

test('parseSliders: null input returns empty array', () => {
  const result = parseSliders(null);
  assert.strictEqual(result.length, 0);
});

test('parseSliders: innerContent captures text between opening and closing tags', () => {
  const markdown = `<!-- slider name="test" min=0 max=100 step=10 value=50 unit="px" -->
  Some padding value here
  with multiple lines
  50px final result
<!-- /slider -->`;

  const result = parseSliders(markdown);
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].innerContent.includes('Some padding value here'));
  assert.ok(result[0].innerContent.includes('50px final result'));
});

// ============================================================================
// serializeSlider TESTS
// ============================================================================

test('serializeSlider: round-trip parse and serialize maintains attributes', () => {
  const original = `<!-- slider name="p" min=16 max=64 step=4 value=32 unit="px" -->padding: 32px;<!-- /slider -->`;

  const parsed = parseSliders(original)[0];
  const serialized = serializeSlider(parsed);

  const reparsed = parseSliders(serialized)[0];

  assert.strictEqual(reparsed.name, parsed.name);
  assert.strictEqual(reparsed.min, parsed.min);
  assert.strictEqual(reparsed.max, parsed.max);
  assert.strictEqual(reparsed.step, parsed.step);
  assert.strictEqual(reparsed.value, parsed.value);
  assert.strictEqual(reparsed.unit, parsed.unit);
});

test('serializeSlider: includes unit attribute when present', () => {
  const slider = {
    name: 'test',
    min: 10,
    max: 50,
    step: 5,
    value: 25,
    unit: 'em',
    innerContent: 'content'
  };

  const serialized = serializeSlider(slider);
  assert.ok(serialized.includes('unit="em"'));
});

test('serializeSlider: omits unit attribute when empty or absent', () => {
  const slider = {
    name: 'test',
    min: 10,
    max: 50,
    step: 5,
    value: 25,
    unit: '',
    innerContent: 'content'
  };

  const serialized = serializeSlider(slider);
  assert.ok(!serialized.includes('unit='));
});

test('serializeSlider: invalid slider (missing name) returns empty string', () => {
  const slider = {
    min: 10,
    max: 50,
    step: 5,
    value: 25,
    unit: 'px'
  };

  const result = serializeSlider(slider);
  assert.strictEqual(result, '');
});

// ============================================================================
// applyValues TESTS
// ============================================================================

test('applyValues: updates value attribute and inner content with new value', () => {
  const markdown = `<!-- slider name="pad" min=16 max=64 step=4 value=32 unit="px" -->padding: 32;<!-- /slider -->`;

  const result = applyValues(markdown, { 'pad': 48 });

  assert.ok(result.includes('value=48'));
  assert.ok(result.includes('padding: 48'));
  assert.ok(!result.includes('value=32'));
});

test('applyValues: preserves unlisted sliders unchanged', () => {
  const markdown = `
<!-- slider name="pad" min=16 max=64 step=4 value=32 unit="px" -->padding: 32;<!-- /slider -->
<!-- slider name="mar" min=8 max=40 step=2 value=16 unit="px" -->margin: 16;<!-- /slider -->
`;

  const result = applyValues(markdown, { 'pad': 48 });

  assert.ok(result.includes('value=48'));
  assert.ok(result.includes('padding: 48'));
  assert.ok(result.includes('value=16'));
  assert.ok(result.includes('margin: 16'));
});

test('applyValues: multiple sliders updated when in valueMap', () => {
  const markdown = `
<!-- slider name="p1" min=10 max=50 step=5 value=25 unit="px" -->padding: 25;<!-- /slider -->
<!-- slider name="p2" min=16 max=64 step=4 value=32 unit="em" -->margin: 32;<!-- /slider -->
`;

  const result = applyValues(markdown, { 'p1': 35, 'p2': 48 });

  assert.ok(result.includes('value=35'));
  assert.ok(result.includes('padding: 35'));
  assert.ok(result.includes('value=48'));
  assert.ok(result.includes('margin: 48'));
});

test('applyValues: empty valueMap returns markdown unchanged', () => {
  const markdown = `<!-- slider name="p" min=16 max=64 step=4 value=32 unit="px" -->padding: 32px;<!-- /slider -->`;

  const result = applyValues(markdown, {});

  assert.strictEqual(result, markdown);
});

test('applyValues: null markdown input returns unchanged', () => {
  const result = applyValues(null, { 'test': 50 });
  assert.strictEqual(result, null);
});

test('applyValues: null valueMap input returns markdown unchanged', () => {
  const markdown = `<!-- slider name="p" min=16 max=64 step=4 value=32 unit="px" -->padding: 32px;<!-- /slider -->`;

  const result = applyValues(markdown, null);

  assert.strictEqual(result, markdown);
});

test('applyValues: word boundary matching prevents partial replacements', () => {
  const markdown = `<!-- slider name="sz" min=10 max=100 step=10 value=50 unit="num" -->size: 50, factor 500;<!-- /slider -->`;

  const result = applyValues(markdown, { 'sz': 60 });

  assert.ok(result.includes('value=60'));
  assert.ok(result.includes('factor 500'));
  // Verify only the numeric 50 value is replaced, not 500
  const sizeMatch = result.match(/size: (\d+)/);
  assert.strictEqual(sizeMatch[1], '60', 'size value should be updated to 60');
});

test('applyValues: numeric value in middle of inner content updated correctly', () => {
  const markdown = `<!-- slider name="gap" min=4 max=32 step=4 value=16 unit="px" -->
grid-gap: 16;
line-height: 2;
margin-top: 16;
<!-- /slider -->`;

  const result = applyValues(markdown, { 'gap': 20 });

  const lines = result.split('\n');
  let gridGapFound = false;
  let marginTopFound = false;
  let lineHeightPreserved = false;

  for (const line of lines) {
    if (line.includes('grid-gap: 20')) gridGapFound = true;
    if (line.includes('margin-top: 20')) marginTopFound = true;
    if (line.includes('line-height: 2')) lineHeightPreserved = true;
  }

  assert.ok(gridGapFound, 'grid-gap should be updated to 20');
  assert.ok(marginTopFound, 'margin-top should be updated to 20');
  assert.ok(lineHeightPreserved, 'line-height should be preserved (not a slider value)');
});
