import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTokens,
  pickContextUsed,
  pickSessionTokens,
  renderSivsLetters,
  renderHud,
} from '../hud-renderer.mjs';

// ============================================================================
// formatTokens
// ============================================================================

test('formatTokens: small counts render as integers', () => {
  assert.equal(formatTokens(0), '0');
  assert.equal(formatTokens(42), '42');
  assert.equal(formatTokens(999), '999');
});

test('formatTokens: thousands use one decimal below 10k', () => {
  assert.equal(formatTokens(1000), '1.0k');
  assert.equal(formatTokens(4230), '4.2k');
});

test('formatTokens: ten-thousands round to integer k', () => {
  assert.equal(formatTokens(12_345), '12k');
  assert.equal(formatTokens(99_900), '100k');
});

test('formatTokens: millions use one decimal M', () => {
  assert.equal(formatTokens(1_500_000), '1.5M');
});

test('formatTokens: 999_500+ promotes to M to avoid "1000k"', () => {
  assert.equal(formatTokens(999_499), '999k');
  assert.equal(formatTokens(999_500), '1.0M');
  assert.equal(formatTokens(1_049_999), '1.0M');
});

test('formatTokens: invalid input returns zero', () => {
  assert.equal(formatTokens(NaN), '0');
  assert.equal(formatTokens(-5), '0');
  assert.equal(formatTokens(undefined), '0');
});

// ============================================================================
// pickContextUsed
// ============================================================================

test('pickContextUsed: prefers used_percentage when present', () => {
  const data = { context_window: { remaining_percentage: 67.4, used_percentage: 32.6 } };
  assert.equal(pickContextUsed(data), 33);
});

test('pickContextUsed: falls back to 100 - remaining_percentage', () => {
  const data = { context_window: { remaining_percentage: 70 } };
  assert.equal(pickContextUsed(data), 30);
});

test('pickContextUsed: returns null when context_window missing', () => {
  assert.equal(pickContextUsed({}), null);
  assert.equal(pickContextUsed(null), null);
});

// ============================================================================
// pickSessionTokens
// ============================================================================

test('pickSessionTokens: sums input + output tokens', () => {
  const data = {
    context_window: { total_input_tokens: 40_000, total_output_tokens: 2_300 },
  };
  assert.equal(pickSessionTokens(data), 42_300);
});

test('pickSessionTokens: returns null when total is zero', () => {
  const data = { context_window: { total_input_tokens: 0, total_output_tokens: 0 } };
  assert.equal(pickSessionTokens(data), null);
});

test('pickSessionTokens: handles missing fields', () => {
  assert.equal(pickSessionTokens({}), null);
  assert.equal(pickSessionTokens({ context_window: {} }), null);
});

// ============================================================================
// renderSivsLetters
// ============================================================================

test('renderSivsLetters: empty config → all-claude 4-letter slash form', () => {
  const out = renderSivsLetters({});
  assert.equal(out.letters, 'C/C/C/C');
  assert.equal(out.mixed, false);
});

test('renderSivsLetters: mixed engines show slash-separated initials', () => {
  const out = renderSivsLetters({
    spec: { engine: 'claude' },
    implement: { engine: 'codex' },
    verify: { engine: 'claude' },
    supervise: { engine: 'codex' },
  });
  assert.equal(out.letters, 'C/X/C/X');
  assert.equal(out.mixed, true);
});

test('renderSivsLetters: unknown engine falls back to claude (C)', () => {
  const out = renderSivsLetters({ spec: { engine: 'gemini' } });
  assert.equal(out.letters, 'C/C/C/C');
});

// ============================================================================
// renderHud
// ============================================================================

test('renderHud: full payload renders ctx (used) · tokens · SIVS 4-letter', () => {
  const data = {
    context_window: {
      used_percentage: 32,
      total_input_tokens: 40_000,
      total_output_tokens: 2_300,
    },
  };
  const line = renderHud(data, {}, { noColor: true });
  assert.equal(line, 'ctx 32% │ 42k tok │ SIVS C/C/C/C');
});

test('renderHud: missing tokens skips the token segment', () => {
  const data = { context_window: { used_percentage: 58 } };
  const line = renderHud(data, {}, { noColor: true });
  assert.equal(line, 'ctx 58% │ SIVS C/C/C/C');
});

test('renderHud: missing context still shows SIVS segment', () => {
  const line = renderHud({}, {}, { noColor: true });
  assert.equal(line, 'SIVS C/C/C/C');
});

test('renderHud: mixed SIVS keeps "SIVS" prefix with slash letters', () => {
  const data = { context_window: { used_percentage: 20 } };
  const sivs = { implement: { engine: 'codex' } };
  const line = renderHud(data, sivs, { noColor: true });
  assert.equal(line, 'ctx 20% │ SIVS C/X/C/C');
});

test('renderHud: low-usage context paints green', () => {
  const data = { context_window: { used_percentage: 16 } };
  const line = renderHud(data, {});
  assert.match(line, /\x1b\[32m/);
  assert.match(line, /\x1b\[0m/);
});

test('renderHud: high-usage context paints red', () => {
  const data = { context_window: { used_percentage: 92 } };
  const line = renderHud(data, {});
  assert.match(line, /\x1b\[31m/);
});
