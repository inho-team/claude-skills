import { createHash } from 'node:crypto';

/**
 * Canonicalizes contract text for deterministic hashing.
 * Rules: normalize line endings, trim trailing spaces, collapse trailing newlines.
 * @param {string} text
 * @returns {string}
 */
export function canonicalize(text) {
  // Normalize CRLF and CR to LF
  let canonical = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Trim trailing whitespace from each line
  canonical = canonical
    .split('\n')
    .map(line => line.replace(/[ \t]+$/, ''))
    .join('\n');

  // Strip trailing whitespace and newlines, then append single LF
  canonical = canonical.replace(/\s+$/, '') + '\n';

  return canonical;
}

/**
 * Compute a stable sha256 hash of contract text, after canonicalization.
 * Canonicalization rules:
 *   1. Normalize CRLF (\r\n) and CR (\r) to LF (\n)
 *   2. Trim trailing whitespace on each line
 *   3. Strip trailing newlines and whitespace at end of file
 *   4. Ensure a single trailing LF
 * @param {string} text
 * @returns {string} — "sha256:<64 hex chars>"
 * @throws {TypeError} if input is not a string
 */
export function computeContractHash(text) {
  if (typeof text !== 'string') {
    throw new TypeError('computeContractHash requires a string');
  }

  const canonical = canonicalize(text);
  const hex = createHash('sha256').update(canonical, 'utf8').digest('hex');

  return `sha256:${hex}`;
}

export default computeContractHash;
