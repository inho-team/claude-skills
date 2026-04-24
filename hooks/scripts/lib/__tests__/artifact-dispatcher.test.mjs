import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dispatch } from '../artifact-dispatcher.mjs';

// ============================================================================
// DISPATCH TESTS
// ============================================================================

test('Dispatch: Code default — no specific keywords → artifacts includes "code"', () => {
  const result = dispatch('Create a landing page');
  assert.ok(result.artifacts.includes('code'), 'artifacts should include "code"');
  assert.ok(Array.isArray(result.artifacts), 'artifacts should be an array');
  assert.ok(typeof result.rationale === 'string', 'rationale should be a string');
});

test('Dispatch: Deck keyword — "deck" in brief → artifacts includes "deck"', () => {
  const result = dispatch('Make a pitch deck for investors');
  assert.ok(result.artifacts.includes('deck'), 'artifacts should include "deck"');
  assert.deepStrictEqual(result.artifacts, ['deck']);
});

test('Dispatch: Prototype keyword — "prototype" suppresses "code"', () => {
  const result = dispatch('Quick prototype of the dashboard');
  assert.ok(result.artifacts.includes('prototype'), 'artifacts should include "prototype"');
  assert.ok(!result.artifacts.includes('code'), 'artifacts should NOT include "code" (prototype suppresses code)');
});

test('Dispatch: Multi-artifact — multiple keywords (deck + doc) without code suppression', () => {
  const result = dispatch('Pitch deck and a PDF report for the same launch');
  assert.ok(result.artifacts.includes('deck'), 'artifacts should include "deck"');
  assert.ok(result.artifacts.includes('doc'), 'artifacts should include "doc"');
});

test('Dispatch: Korean keyword — "데크" triggers deck artifact', () => {
  const result = dispatch('데크 만들어줘');
  assert.ok(result.artifacts.includes('deck'), 'artifacts should include "deck"');
});

test('Dispatch: Empty brief — dispatch("") returns ["code"] without throw', () => {
  const result = dispatch('');
  assert.deepStrictEqual(result.artifacts, ['code']);
  assert.ok(typeof result.rationale === 'string');
});

test('Dispatch: Null brief — dispatch(null) returns ["code"] without throw', () => {
  const result = dispatch(null);
  assert.deepStrictEqual(result.artifacts, ['code']);
});

test('Dispatch: Whitespace-only brief — dispatch("   ") returns ["code"] without throw', () => {
  const result = dispatch('   ');
  assert.deepStrictEqual(result.artifacts, ['code']);
});

test('Dispatch: PDF/doc keyword — "One-pager report" includes "doc"', () => {
  const result = dispatch('One-pager report');
  assert.ok(result.artifacts.includes('doc'), 'artifacts should include "doc"');
});

test('Dispatch: Mockup keyword — "Wireframe of checkout flow" includes "mockup"', () => {
  const result = dispatch('Wireframe of checkout flow');
  assert.ok(result.artifacts.includes('mockup'), 'artifacts should include "mockup"');
});

test('Dispatch: Dedup + stable order — "deck slides presentation" has no duplicate deck', () => {
  const result = dispatch('deck slides presentation');
  const deckCount = result.artifacts.filter(a => a === 'deck').length;
  assert.strictEqual(deckCount, 1, 'artifacts should contain exactly one "deck"');
});

test('Dispatch: Case-insensitive matching — "DECK" matches deck artifact', () => {
  const result = dispatch('Make a DECK for the team');
  assert.ok(result.artifacts.includes('deck'));
});

test('Dispatch: Slides synonym — "slides" matches deck artifact', () => {
  const result = dispatch('Create slides for the presentation');
  assert.ok(result.artifacts.includes('deck'));
});

test('Dispatch: Presentation synonym — "presentation" matches deck artifact', () => {
  const result = dispatch('I need a presentation');
  assert.ok(result.artifacts.includes('deck'));
});

test('Dispatch: Pitch synonym — "pitch" matches deck artifact', () => {
  const result = dispatch('Build a pitch for the investor');
  assert.ok(result.artifacts.includes('deck'));
});

test('Dispatch: Korean 슬라이드 — "슬라이드" matches deck artifact', () => {
  const result = dispatch('좋은 슬라이드 만들어줘');
  assert.ok(result.artifacts.includes('deck'));
});

test('Dispatch: Korean 발표 — "발표" matches deck artifact', () => {
  const result = dispatch('발표 자료 준비해줘');
  assert.ok(result.artifacts.includes('deck'));
});

test('Dispatch: PDF keyword — "pdf" matches doc artifact', () => {
  const result = dispatch('Generate a pdf document');
  assert.ok(result.artifacts.includes('doc'));
});

test('Dispatch: Report keyword — "report" matches doc artifact', () => {
  const result = dispatch('Write a quarterly report');
  assert.ok(result.artifacts.includes('doc'));
});

test('Dispatch: Korean 문서 — "문서" matches doc artifact', () => {
  const result = dispatch('문서 작성해줘');
  assert.ok(result.artifacts.includes('doc'));
});

test('Dispatch: Korean 원페이저 — "원페이저" matches doc artifact', () => {
  const result = dispatch('원페이저 만들어줘');
  assert.ok(result.artifacts.includes('doc'));
});

test('Dispatch: Mock-up hyphenated — "mock-up" matches mockup artifact', () => {
  const result = dispatch('Create a mock-up of the interface');
  assert.ok(result.artifacts.includes('mockup'));
});

test('Dispatch: Korean 목업 — "목업" matches mockup artifact', () => {
  const result = dispatch('앱의 목업을 만들어줘');
  assert.ok(result.artifacts.includes('mockup'));
});

test('Dispatch: Korean 와이어프레임 — "와이어프레임" matches mockup artifact', () => {
  const result = dispatch('와이어프레임 그려줘');
  assert.ok(result.artifacts.includes('mockup'));
});

test('Dispatch: Sketch keyword — "sketch" matches prototype artifact', () => {
  const result = dispatch('Sketch a quick interface');
  assert.ok(result.artifacts.includes('prototype'));
  assert.ok(!result.artifacts.includes('code'));
});

test('Dispatch: Draft keyword — "draft" matches prototype artifact', () => {
  const result = dispatch('Create a draft of the feature');
  assert.ok(result.artifacts.includes('prototype'));
  assert.ok(!result.artifacts.includes('code'));
});

test('Dispatch: Quick keyword — "quick" matches prototype artifact', () => {
  const result = dispatch('I need something quick and rough');
  assert.ok(result.artifacts.includes('prototype'));
  assert.ok(!result.artifacts.includes('code'));
});

test('Dispatch: Korean 빠른 — "빠른" matches prototype artifact', () => {
  const result = dispatch('빠른 프로토타입을 만들어줘');
  assert.ok(result.artifacts.includes('prototype'));
  assert.ok(!result.artifacts.includes('code'));
});

test('Dispatch: Korean 스케치 — "스케치" matches prototype artifact', () => {
  const result = dispatch('스케치부터 시작해줘');
  assert.ok(result.artifacts.includes('prototype'));
  assert.ok(!result.artifacts.includes('code'));
});

test('Dispatch: Korean 프로토타입 — "프로토타입" matches prototype artifact', () => {
  const result = dispatch('프로토타입 구현해줘');
  assert.ok(result.artifacts.includes('prototype'));
  assert.ok(!result.artifacts.includes('code'));
});

test('Dispatch: Stable order — multiple artifacts are returned in [code, prototype, deck, doc, mockup] order', () => {
  const result = dispatch('mockup and deck and code and prototype');
  assert.deepStrictEqual(result.artifacts, ['prototype', 'deck', 'mockup']);
  // Note: prototype suppresses code, so code is not included
});

test('Dispatch: Return object has required keys', () => {
  const result = dispatch('Create a landing page');
  assert.ok(Object.prototype.hasOwnProperty.call(result, 'artifacts'));
  assert.ok(Object.prototype.hasOwnProperty.call(result, 'rationale'));
});

test('Dispatch: Rationale is non-empty string', () => {
  const result = dispatch('Create a pitch deck');
  assert.ok(typeof result.rationale === 'string');
  assert.ok(result.rationale.length > 0);
});

test('Dispatch: Default code rationale mentions "fallback" or "no specific keywords"', () => {
  const result = dispatch('Build me something');
  assert.match(result.rationale, /fallback|no specific keywords/i);
});

test('Dispatch: Prototype + code → only prototype in result, rationale mentions prototype', () => {
  const result = dispatch('Quick prototype and some code');
  assert.deepStrictEqual(result.artifacts, ['prototype']);
  assert.ok(result.rationale.toLowerCase().includes('prototype'));
});

test('Dispatch: Non-string input (number) → returns default code', () => {
  const result = dispatch(123);
  assert.deepStrictEqual(result.artifacts, ['code']);
});

test('Dispatch: Non-string input (object) → returns default code', () => {
  const result = dispatch({ text: 'some text' });
  assert.deepStrictEqual(result.artifacts, ['code']);
});

test('Dispatch: Multiple deck synonyms → single deck in result', () => {
  const result = dispatch('deck presentation slides pitch');
  const deckCount = result.artifacts.filter(a => a === 'deck').length;
  assert.strictEqual(deckCount, 1);
  assert.deepStrictEqual(result.artifacts, ['deck']);
});

test('Dispatch: Deck + mockup — both present without suppression', () => {
  const result = dispatch('Create a deck with mockups');
  assert.ok(result.artifacts.includes('deck'));
  assert.ok(result.artifacts.includes('mockup'));
});

test('Dispatch: Deck + doc — both present in stable order', () => {
  const result = dispatch('A deck and a pdf report');
  assert.deepStrictEqual(result.artifacts, ['deck', 'doc']);
});

test('Dispatch: All 5 artifact types together with prototype suppressing code', () => {
  const result = dispatch('prototype mockup deck pdf report code');
  assert.ok(result.artifacts.includes('prototype'));
  assert.ok(result.artifacts.includes('mockup'));
  assert.ok(result.artifacts.includes('deck'));
  assert.ok(result.artifacts.includes('doc'));
  assert.ok(!result.artifacts.includes('code'), 'prototype should suppress code');
});

test('Dispatch: Onepager (no hyphen) matches doc', () => {
  const result = dispatch('onepager');
  assert.ok(result.artifacts.includes('doc'));
});

test('Dispatch: Mixed case keywords are lowercased before matching', () => {
  const result = dispatch('MOCKUP');
  assert.ok(result.artifacts.includes('mockup'));
});

test('Dispatch: Keyword in middle of word is matched (substring match)', () => {
  const result = dispatch('I love presentations');
  assert.ok(result.artifacts.includes('deck'));
});

test('Dispatch: Empty artifacts array never returned (at minimum has "code")', () => {
  const result = dispatch('random text without keywords');
  assert.ok(result.artifacts.length > 0);
  assert.ok(result.artifacts.includes('code'));
});

test('Dispatch: Undefined brief → returns default code without throw', () => {
  const result = dispatch(undefined);
  assert.deepStrictEqual(result.artifacts, ['code']);
});

// ============================================================================
// REGRESSION — v6.6.1: implicit UI keywords (code trigger)
// ============================================================================

test('Regression: "Pitch deck and the landing page" → multi-artifact [code, deck]', () => {
  const r = dispatch('Pitch deck and the landing page for the same launch');
  assert.ok(r.artifacts.includes('deck'), 'deck matched');
  assert.ok(r.artifacts.includes('code'), 'code matched via "landing page"');
});

test('Regression: "Landing page hero" → code with keyword rationale (not fallback)', () => {
  const r = dispatch('Landing page hero for a SaaS analytics product');
  assert.deepEqual(r.artifacts, ['code']);
  assert.ok(!r.rationale.toLowerCase().includes('default fallback'),
    `rationale should not claim fallback, got: ${r.rationale}`);
});

test('Regression: Korean UI keyword "페이지" triggers code', () => {
  const r = dispatch('새 페이지 만들어줘');
  assert.ok(r.artifacts.includes('code'));
});
