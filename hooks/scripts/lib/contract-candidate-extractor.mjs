#!/usr/bin/env node
'use strict';

/**
 * Contract Candidate Extractor — Scans TASK_REQUEST for contract candidate files.
 *
 * When the opt-in marker `<!-- contract-candidates: auto -->` is present, parses the
 * checklist section to find `.mjs` output files and proposes contract drafts.
 */

import path from 'node:path';

/**
 * Check whether the text contains the contract-candidates auto opt-in marker.
 * Accepts whitespace before and after "auto" and before the closing "-->".
 *
 * @param {string} text
 * @returns {boolean} True if the marker is found
 */
export function hasAutoMarker(text) {
  if (typeof text !== 'string') {
    return false;
  }
  return /<!--\s*contract-candidates:\s*auto\s*-->/.test(text);
}

/**
 * Extract contract candidates from TASK_REQUEST markdown.
 *
 * Behavior:
 *   - If the text does NOT contain the opt-in marker `<!-- contract-candidates: auto -->`, return [].
 *   - Otherwise, parse the "## 체크리스트" / "## Checklist" section for items matching: `→ output: <path>.mjs`
 *   - For each such item, generate a candidate: { name, targetPath, suggestedSignature }
 *     - name: basename without extension, with non-[a-zA-Z0-9_-] replaced by '-'
 *     - targetPath: the matched path as-is
 *     - suggestedSignature: empty string for now
 *   - Dedupe by name (first wins)
 *   - Skip test files (paths containing `/__tests__/` or ending `.test.mjs`)
 *   - Return array (possibly empty if marker present but no qualifying items found)
 *
 * @param {string} taskRequestText
 * @returns {Array<{name: string, targetPath: string, suggestedSignature: string}>}
 */
export function extractCandidates(taskRequestText) {
  if (typeof taskRequestText !== 'string') {
    return [];
  }

  // Check for opt-in marker
  if (!hasAutoMarker(taskRequestText)) {
    return [];
  }

  // Locate the checklist section
  const checklistMatch = taskRequestText.match(
    /##\s+(?:체크리스트|Checklist)\s*\n([\s\S]*?)(?=\n##\s+|\Z)/i
  );

  if (!checklistMatch) {
    return [];
  }

  const checklistText = checklistMatch[1];
  const lines = checklistText.split('\n');
  const candidates = [];
  const seenNames = new Set();

  for (const line of lines) {
    // Match checkbox items: `- [ ]` or `- [x]`
    if (!line.match(/^\s*-\s*\[[^\]]*\]/)) {
      continue;
    }

    // Look for `→ output: <path>` or ` output: <path>` pattern
    const outputMatch = line.match(/(?:→\s+|output:\s+)([^\s]+?\.mjs)(?:\s|$|<!--)/);
    if (!outputMatch) {
      continue;
    }

    const targetPath = outputMatch[1];

    // Skip test files
    if (targetPath.includes('/__tests__/') || targetPath.endsWith('.test.mjs')) {
      continue;
    }

    // Derive the name from the basename
    const basename = path.basename(targetPath, '.mjs');
    const name = basename.replace(/[^a-zA-Z0-9_-]/g, '-');

    // Skip if already seen (dedupe)
    if (seenNames.has(name)) {
      continue;
    }

    seenNames.add(name);
    candidates.push({
      name,
      targetPath,
      suggestedSignature: '',
    });
  }

  return candidates;
}

export default extractCandidates;
