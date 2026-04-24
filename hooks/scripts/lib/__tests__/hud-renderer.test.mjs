import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTokens,
  pickContextRemaining,
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
// pickContextRemaining
// ============================================================================

test('pickContextRemaining: prefers remaining_percentage when present', () => {
  const data = { context_window: { remaining_percentage: 67.4, used_percentage: 32.6 } };
  assert.equal(pickContextRemaining(data), 67);
});

test('pickContextRemaining: falls back to 100 - used_percentage', () => {
  const data = { context_window: { used_percentage: 30 } };
  assert.equal(pickContextRemaining(data), 70);
});

test('pickContextRemaining: returns null when context_window missing', () => {
  assert.equal(pickContextRemaining({}), null);
  assert.equal(pickContextRemaining(null), null);
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

test('renderSivsLetters: empty config → all-claude "claude" label', () => {
  const out = renderSivsLetters({});
  assert.equal(out.letters, 'claude');
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
  assert.equal(out.letters, 'claude');
});

// ============================================================================
// renderHud
// ============================================================================

test('renderHud: full payload renders ctx · tokens · SIVS (noColor)', () => {
  const data = {
    context_window: {
      remaining_percentage: 68,
      total_input_tokens: 40_000,
      total_output_tokens: 2_300,
    },
  };
  const line = renderHud(data, {}, { noColor: true });
  assert.equal(line, 'ctx 68% │ 42k tok │ SIVS claude');
});

test('renderHud: missing tokens skips the token segment', () => {
  const data = { context_window: { remaining_percentage: 42 } };
  const line = renderHud(data, {}, { noColor: true });
  assert.equal(line, 'ctx 42% │ SIVS claude');
});

test('renderHud: missing context still shows SIVS segment', () => {
  const line = renderHud({}, {}, { noColor: true });
  assert.equal(line, 'SIVS claude');
});

test('renderHud: mixed SIVS keeps "SIVS" prefix with slash letters', () => {
  const data = { context_window: { remaining_percentage: 80 } };
  const sivs = { implement: { engine: 'codex' } };
  const line = renderHud(data, sivs, { noColor: true });
  assert.equal(line, 'ctx 80% │ SIVS C/X/C/C');
});

test('renderHud: applies ANSI color by default', () => {
  const data = { context_window: { remaining_percentage: 68 } };
  const line = renderHud(data, {});
  assert.match(line, /\x1b\[32m/);
  assert.match(line, /\x1b\[0m/);
});
