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
  // 'code' explicit triggers — without these, code is only a fallback when
  // no other keyword matches, which misses multi-artifact briefs like
  // "pitch deck and the landing page" (deck + code both intended).
  code: [
    'landing page', 'page', 'component', 'ui', 'interface',
    'screen', 'form', 'dashboard', 'view', 'app', 'website',
    'webapp', 'site', 'button',
    '페이지', '화면', '컴포넌트', '사이트', '앱', '랜딩',
  ],
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

// Hangul Jamo + Syllables range — if a keyword is pure CJK, use substring match.
// Latin keywords use word-boundary regex so "ui" doesn't match "build".
const CJK_ONLY_RE = /^[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF]+$/;

function keywordMatches(brief, keyword) {
  if (CJK_ONLY_RE.test(keyword)) {
    return brief.includes(keyword);
  }
  // Leading word-boundary only: matches "mockup" in "mockups" and "presentation"
  // in "presentations", but not "ui" in "build" or "app" in "happen".
  const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${esc}`, 'i').test(brief);
}

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

  const matched = new Set();

  // --- Keyword matching (word-boundary for Latin, substring for CJK) ---
  for (const [keyword, artifact] of Object.entries(KEYWORD_LOOKUP)) {
    if (keywordMatches(brief, keyword)) {
      matched.add(artifact);
    }
  }

  const matchedViaKeyword = matched.size > 0;

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
  if (!matchedViaKeyword) {
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
