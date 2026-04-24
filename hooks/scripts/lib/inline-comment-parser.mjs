/**
 * inline-comment-parser.mjs
 * Extracts `<!-- claude: ... -->` directives from source code files.
 * These directives are user-written instructions for skill iteration
 * (e.g., "make this more compact", "use primary color here").
 */

import { existsSync, readFileSync } from 'fs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pattern to match HTML-style comments with lowercase 'claude:' prefix. */
const CLAUDE_DIRECTIVE_PATTERN = /<!--\s*claude:\s*(.+?)-->/gs;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a line is empty (only whitespace).
 * @param {string} line
 * @returns {boolean}
 */
function isEmptyLine(line) {
  return /^\s*$/.test(line);
}

/**
 * Check if a line is a comment (HTML, JS-style single, or multi-line).
 * @param {string} line
 * @returns {boolean}
 */
function isCommentLine(line) {
  const trimmed = line.trim();
  return /^<!--/.test(trimmed) ||
         /^\/\//.test(trimmed) ||
         /^\/\*/.test(trimmed) ||
         /^\*/.test(trimmed);
}

/**
 * Find the line number (1-indexed) of the first non-empty, non-comment line
 * after the given line number.
 * @param {string[]} lines - Array of file lines
 * @param {number} afterLineNum - 0-indexed line number to start searching after
 * @returns {number} 1-indexed line number, or the comment line itself if no code follows
 */
function findTargetLine(lines, afterLineNum) {
  for (let i = afterLineNum; i < lines.length; i++) {
    if (!isEmptyLine(lines[i]) && !isCommentLine(lines[i])) {
      return i + 1; // Convert to 1-indexed
    }
  }
  // No code found after comment — use the comment line itself
  return afterLineNum + 1; // Convert to 1-indexed
}

/**
 * Normalize multi-line directive text by joining with single space and trimming.
 * @param {string} rawDirective
 * @returns {string}
 */
function normalizeDirective(rawDirective) {
  return rawDirective
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

// ---------------------------------------------------------------------------
// extractDirectives
// ---------------------------------------------------------------------------

/**
 * Extract `<!-- claude: ... -->` directives from a source file.
 *
 * Only HTML-style comments with exactly lowercase `claude:` prefix are recognized.
 * For each directive, identifies the first non-empty, non-comment line that follows
 * (the targetLine it annotates). Supports multi-line directives.
 *
 * @param {string} filePath - Absolute path to the source file
 * @returns {Array<{directive: string, targetLine: number, file: string}>}
 *   - directive: Text after "claude:", trimmed (multi-line directives joined with spaces)
 *   - targetLine: 1-indexed line number of the annotated code line
 *   - file: The filePath as passed in
 *   Returns empty array if file does not exist or on read error.
 *   Never throws.
 */
export function extractDirectives(filePath) {
  try {
    if (!existsSync(filePath)) {
      return [];
    }

    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const results = [];

    // Find all <!-- claude: ... --> matches with their positions
    let match;
    while ((match = CLAUDE_DIRECTIVE_PATTERN.exec(content)) !== null) {
      const rawDirective = match[1];
      const directive = normalizeDirective(rawDirective);

      // Calculate which line this comment is on
      const commentTextBefore = content.slice(0, match.index);
      const commentLineNum = (commentTextBefore.match(/\n/g) || []).length;

      // Find the target line (first non-empty, non-comment line after)
      const targetLine = findTargetLine(lines, commentLineNum);

      results.push({
        directive,
        targetLine,
        file: filePath,
      });
    }

    return results;
  } catch {
    // Never throw — return empty array on any error
    return [];
  }
}
