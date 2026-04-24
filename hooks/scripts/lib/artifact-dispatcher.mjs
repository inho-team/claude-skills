/**
 * artifact-dispatcher.mjs
 * Analyzes a natural-language brief and determines which design artifacts to produce.
 * Provides keyword mapping, multi-artifact support, and prototype-suppresses-code logic.
 */

// ---------------------------------------------------------------------------
// Keyword Mapping
// ---------------------------------------------------------------------------

const KEYWORD_MAP = {
  deck: ['deck', 'slides', 'slide', 'presentation', 'pitch', '데크', '슬라이드', '발표'],
  doc: ['pdf', 'one-pager', 'onepager', 'report', '문서', '원페이저'],
  mockup: ['mockup', 'mock-up', 'wireframe', '목업', '와이어프레임'],
  prototype: ['prototype', 'draft', 'quick', 'sketch', '빠른', '스케치', '프로토타입'],
};

// Flatten keyword map into a lookup object: keyword → artifact type
const KEYWORD_LOOKUP = {};
for (const [artifact, keywords] of Object.entries(KEYWORD_MAP)) {
  for (const keyword of keywords) {
    KEYWORD_LOOKUP[keyword.toLowerCase()] = artifact;
  }
}

// Stable artifact order for consistent deduplication
const ARTIFACT_ORDER = ['code', 'prototype', 'deck', 'doc', 'mockup'];

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

/**
 * Analyzes a natural-language brief and determines which design artifacts to produce.
 *
 * @param {string} brief - Natural language request (case-insensitive)
 * @returns {{artifacts: string[], rationale: string}}
 *   artifacts: subset of ['code', 'deck', 'doc', 'mockup', 'prototype'] in stable order
 *   rationale: one-line explanation (~80 chars) of why this set was chosen
 */
export function dispatch(brief) {
  // --- Handle empty/null/whitespace-only input ---
  if (!brief || typeof brief !== 'string' || brief.trim().length === 0) {
    return {
      artifacts: ['code'],
      rationale: 'Default fallback: no brief provided, assuming UI code request',
    };
  }

  const briefLower = brief.toLowerCase();
  const matched = new Set();

  // --- Keyword matching ---
  for (const [keyword, artifact] of Object.entries(KEYWORD_LOOKUP)) {
    if (briefLower.includes(keyword)) {
      matched.add(artifact);
    }
  }

  // --- Default to code if no keywords matched ---
  if (matched.size === 0) {
    matched.add('code');
  }

  // --- Prototype suppresses code rule ---
  if (matched.has('prototype') && matched.has('code')) {
    matched.delete('code');
  }

  // --- Deduplicate and sort by stable order ---
  const artifacts = ARTIFACT_ORDER.filter(a => matched.has(a));

  // --- Generate rationale ---
  let rationale;
  if (artifacts.length === 1 && artifacts[0] === 'code') {
    rationale = 'Default fallback: no specific keywords matched';
  } else if (artifacts.length === 1) {
    const art = artifacts[0];
    const keywords = KEYWORD_MAP[art];
    rationale = `Matched keyword(s): ${keywords.slice(0, 2).join(', ')}`;
  } else {
    const keys = [];
    for (const art of artifacts) {
      const keywords = KEYWORD_MAP[art];
      keys.push(keywords[0]);
    }
    rationale = `Multiple keywords: ${keys.join(', ')}`;
  }

  return { artifacts, rationale };
}
