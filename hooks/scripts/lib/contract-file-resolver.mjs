#!/usr/bin/env node
'use strict';

/**
 * Contract File Resolver — Resolves contract markdown to impl and test file paths.
 * Respects <!-- target: path --> and <!-- tests: path --> markers; enforces security checks.
 */

import path from 'node:path';
import { assertValidContractName } from './contract-manifest.mjs';

// Placeholder patterns that indicate the marker value was a template stub,
// not a real path. Treat these as "no marker" so resolver falls back to
// convention instead of erroring on assertPathDoesNotEscape.
const PLACEHOLDER_PATTERN = /\.{3,}|<[^>]*>|\b(TODO|TBD|WIP|FIXME|PLACEHOLDER)\b/i;

/**
 * Check whether a marker value is a template placeholder rather than a real path.
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlaceholder(value) {
  return typeof value === 'string' && PLACEHOLDER_PATTERN.test(value);
}

/**
 * Extract <!-- target: path --> and <!-- tests: path --> markers from contract text.
 * Placeholder-shaped values (ellipsis, <brackets>, TODO/TBD/WIP/FIXME) are
 * treated as absent so callers fall back to convention paths.
 * @param {string} contractText
 * @returns {{target: string | null, tests: string | null}}
 */
export function extractMarkers(contractText) {
  // Type guard: if not a string, return null markers.
  if (typeof contractText !== 'string') {
    return { target: null, tests: null };
  }

  const targetRegex = /<!--\s*target:\s*([^\s-][^\n]*?)\s*-->/;
  const testsRegex = /<!--\s*tests:\s*([^\s-][^\n]*?)\s*-->/;

  const targetMatch = contractText.match(targetRegex);
  const testsMatch = contractText.match(testsRegex);

  const target = targetMatch ? targetMatch[1].trim() : null;
  const tests = testsMatch ? testsMatch[1].trim() : null;

  return {
    target: isPlaceholder(target) ? null : target,
    tests: isPlaceholder(tests) ? null : tests
  };
}

/**
 * Check whether a path escapes the project root (contains .. segments).
 * @param {string} filePath
 * @throws {Error} if path escapes project root
 */
function assertPathDoesNotEscape(filePath) {
  const normalized = path.normalize(filePath);
  if (normalized.includes('..')) {
    throw new Error(`Marker path escapes project root: ${filePath}`);
  }
}

/**
 * Resolve impl path for a contract.
 * Checks contract markdown for <!-- target: path --> marker first;
 * falls back to convention hooks/scripts/lib/{name}.mjs.
 * Enforces path safety (rejects .. segments).
 * @param {string} name — contract name (must pass assertValidContractName)
 * @param {string} contractText — the contract markdown content (may contain markers)
 * @returns {string} impl path relative to project root
 * @throws {Error} if name is invalid or marker path escapes project root
 */
export function resolveImplPath(name, contractText) {
  assertValidContractName(name);
  const { target } = extractMarkers(contractText);

  if (target && typeof target === 'string' && target.length > 0) {
    assertPathDoesNotEscape(target);
    return target;
  }

  return `hooks/scripts/lib/${name}.mjs`;
}

/**
 * Resolve tests path for a contract.
 * Checks contract markdown for <!-- tests: path --> marker first;
 * falls back to convention hooks/scripts/lib/__tests__/{name}.test.mjs.
 * Enforces path safety (rejects .. segments).
 * @param {string} name — contract name (must pass assertValidContractName)
 * @param {string} contractText — the contract markdown content (may contain markers)
 * @returns {string} tests path relative to project root
 * @throws {Error} if name is invalid or marker path escapes project root
 */
export function resolveTestPath(name, contractText) {
  assertValidContractName(name);
  const { tests } = extractMarkers(contractText);

  if (tests && typeof tests === 'string' && tests.length > 0) {
    assertPathDoesNotEscape(tests);
    return tests;
  }

  return `hooks/scripts/lib/__tests__/${name}.test.mjs`;
}

export default { extractMarkers, resolveImplPath, resolveTestPath };
