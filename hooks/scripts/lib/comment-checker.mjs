/**
 * comment-checker.mjs
 * Analyzes source code files for missing documentation comments.
 * Pure regex-based analysis — no external dependencies.
 */

// ---------------------------------------------------------------------------
// Language map: extension → language name
// ---------------------------------------------------------------------------

const LANG_MAP = {
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python',
  '.java': 'java', '.kt': 'kotlin',
  '.go': 'go',
  '.rs': 'rust',
  '.cpp': 'cpp', '.h': 'cpp', '.hpp': 'cpp', '.c': 'cpp',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.php': 'php',
  '.rb': 'ruby',
  '.dart': 'dart',
};

// Config / data file extensions that should never be checked.
const CONFIG_EXTS = new Set(['.json', '.yaml', '.yml', '.toml', '.xml', '.env']);

// ---------------------------------------------------------------------------
// Documentation-comment patterns (one line immediately above a signature)
// ---------------------------------------------------------------------------

const COMMENT_ABOVE = {
  javascript: /^\s*(\/\*\*|\/\/)/,
  typescript: /^\s*(\/\*\*|\/\/)/,
  python:     /^\s*("""|'''|#)/,
  java:       /^\s*\/\*\*/,
  kotlin:     /^\s*\/\*\*/,
  go:         /^\s*\/\//,
  rust:       /^\s*(\/\/\/|\/\/!)/,
  cpp:        /^\s*(\/\*\*|\/\/\/)/,
  csharp:     /^\s*\/\/\//,
  swift:      /^\s*\/\/\//,
  php:        /^\s*\/\*\*/,
  ruby:       /^\s*#/,
  dart:       /^\s*\/\/\//,
};

// ---------------------------------------------------------------------------
// Signature patterns per language
// Each entry: { pattern: RegExp, type: string, nameGroup: number }
// ---------------------------------------------------------------------------

/**
 * Returns an array of signature matchers for the given language.
 * @param {string} language
 * @returns {Array<{pattern: RegExp, type: string, nameGroup: number}>}
 */
function getMatchers(language) {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return [
        // export async function NAME / export function NAME / function NAME / async function NAME
        {
          pattern: /^[ \t]*(export\s+)?(async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[(<]/,
          type: 'function',
          nameGroup: 3,
        },
        // export class NAME / class NAME
        {
          pattern: /^[ \t]*(export\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
          type: 'class',
          nameGroup: 2,
        },
        // export const NAME = (async)? ( ...
        {
          pattern: /^[ \t]*export\s+(const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(async\s+)?\(/,
          type: 'function',
          nameGroup: 2,
        },
      ];

    case 'python':
      return [
        // (async )?def NAME(   — skip _NAME
        {
          pattern: /^[ \t]*(async\s+)?def\s+([A-Za-z][A-Za-z0-9_]*)\s*\(/,
          type: 'function',
          nameGroup: 2,
          skip: (name) => name.startsWith('_'),
        },
        // class NAME
        {
          pattern: /^[ \t]*class\s+([A-Za-z_][A-Za-z0-9_]*)/,
          type: 'class',
          nameGroup: 1,
        },
      ];

    case 'java':
      return [
        // (public|protected) ... class|interface|enum NAME
        {
          pattern: /^[ \t]*(public|protected)\s+.*?\b(class|interface|enum)\s+([A-Za-z_][A-Za-z0-9_]*)/,
          type: 'class',
          nameGroup: 3,
        },
        // (public|protected) ... NAME(
        {
          pattern: /^[ \t]*(public|protected)\s+(?!class\b|interface\b|enum\b).*?\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
          type: 'method',
          nameGroup: 2,
        },
      ];

    case 'kotlin':
      return [
        // (public|protected) ... class|interface NAME
        {
          pattern: /^[ \t]*(public|protected|open|abstract|sealed|data|inner)\s+.*?\b(class|interface|object)\s+([A-Za-z_][A-Za-z0-9_]*)/,
          type: 'class',
          nameGroup: 3,
        },
        // fun NAME(  — public/protected only (no private)
        {
          pattern: /^[ \t]*(public|protected|override|open|internal|actual|expect)?\s*(suspend\s+)?fun\s+([A-Za-z_][A-Za-z0-9_]*)\s*[(<]/,
          type: 'function',
          nameGroup: 3,
          skip: (name, line) => /\bprivate\b/.test(line),
        },
      ];

    case 'go':
      return [
        // func NAME( or func (receiver) NAME(
        {
          pattern: /^func\s+(?:\([^)]*\)\s+)?([A-Z][A-Za-z0-9_]*)\s*[(<[]/,
          type: 'function',
          nameGroup: 1,
        },
      ];

    case 'rust':
      return [
        // pub fn NAME / pub struct NAME / pub enum NAME / pub trait NAME
        {
          pattern: /^[ \t]*pub\s+(fn|struct|enum|trait)\s+([A-Za-z_][A-Za-z0-9_]*)/,
          type: 'item',
          nameGroup: 2,
        },
      ];

    case 'cpp':
      return [
        // class NAME / struct NAME
        {
          pattern: /^[ \t]*(class|struct)\s+([A-Za-z_][A-Za-z0-9_]*)\s*[:{]/,
          type: 'class',
          nameGroup: 2,
        },
        // type NAME( — top-level function-like patterns (simplified)
        {
          pattern: /^[A-Za-z_][A-Za-z0-9_:\s*&<>]*\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
          type: 'function',
          nameGroup: 1,
          skip: (name, line) => /^\s*(if|for|while|switch|return|else|do)\b/.test(line),
        },
      ];

    case 'csharp':
      return [
        // (public|protected|internal) ... class|interface|struct|record NAME
        {
          pattern: /^[ \t]*(public|protected|internal)\s+.*?\b(class|interface|struct|record)\s+([A-Za-z_][A-Za-z0-9_]*)/,
          type: 'class',
          nameGroup: 3,
        },
        // (public|protected|internal) ... NAME(
        {
          pattern: /^[ \t]*(public|protected|internal)\s+(?!class\b|interface\b|struct\b|record\b).*?\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
          type: 'method',
          nameGroup: 2,
          skip: (name, line) => /\bprivate\b/.test(line),
        },
      ];

    case 'swift':
      return [
        // (public|open) func|class|struct|protocol NAME
        {
          pattern: /^[ \t]*(public|open)\s+(func|class|struct|protocol|enum)\s+([A-Za-z_][A-Za-z0-9_]*)/,
          type: 'item',
          nameGroup: 3,
        },
      ];

    case 'php':
      return [
        // class NAME
        {
          pattern: /^[ \t]*(abstract\s+|final\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/,
          type: 'class',
          nameGroup: 2,
        },
        // (public|protected) function NAME
        {
          pattern: /^[ \t]*(public|protected)\s+(static\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
          type: 'function',
          nameGroup: 3,
          skip: (name) => name.startsWith('_'),
        },
      ];

    case 'ruby':
      return [
        // class NAME
        {
          pattern: /^[ \t]*class\s+([A-Z][A-Za-z0-9_]*)/,
          type: 'class',
          nameGroup: 1,
        },
        // def NAME   — skip _name
        {
          pattern: /^[ \t]*def\s+([A-Za-z_][A-Za-z0-9_?!]*)/,
          type: 'method',
          nameGroup: 1,
          skip: (name) => name.startsWith('_'),
        },
      ];

    case 'dart':
      return [
        // class NAME
        {
          pattern: /^[ \t]*(abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/,
          type: 'class',
          nameGroup: 2,
        },
        // function/method NAME( — skip _name
        {
          pattern: /^[ \t]*(?:(?:static|async|Future<[^>]*>|void|int|double|String|bool|List|Map|dynamic)\s+)+([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
          type: 'function',
          nameGroup: 1,
          skip: (name) => name.startsWith('_'),
        },
      ];

    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Returns the file extension (lowercased, including leading dot) for a path.
 * @param {string} filePath
 * @returns {string}
 */
function getFileExtension(filePath) {
  const dot = filePath.lastIndexOf('.');
  if (dot === -1) return '';
  return filePath.slice(dot).toLowerCase();
}

/**
 * Returns true when the given file should be analyzed.
 * @param {string} filePath
 * @returns {boolean}
 */
export function isCheckableFile(filePath) {
  const ext = getFileExtension(filePath);
  return LANG_MAP.hasOwnProperty(ext) && !CONFIG_EXTS.has(ext);
}

// Matches block-comment continuation lines: " * body", " *", " *<EOL>".
// The `$` alternative is required so blank JSDoc continuation lines (a lone
// asterisk with no trailing content) are treated as transparent during the
// doc-walk; otherwise a valid multi-paragraph JSDoc block would break the
// walk and every function below it gets flagged as undocumented.
const BLOCK_COMMENT_CONT = /^\s*\*([\s/]|$)/;
// Matches a pure block-comment close with nothing else on the line
const BLOCK_COMMENT_CLOSE = /^\s*\*\/\s*$/;

/**
 * Checks whether a documentation comment appears within the 5 lines above
 * `lineIndex` (0-based) in the `lines` array.
 *
 * The walk is transparent to block-comment body/close lines so that a full
 * JSDoc / KDoc / Javadoc block (opener on line N-3, closer on line N-1) is
 * correctly recognized even though the block-comment close marker sits
 * immediately above the signature.
 *
 * @param {string[]} lines
 * @param {number} lineIndex
 * @param {RegExp} commentPattern
 * @returns {boolean}
 */
function hasCommentAbove(lines, lineIndex, commentPattern) {
  // Look-back cap sized for realistic multi-paragraph JSDoc / docstring blocks
  // (header + description + @param/@returns/@throws/@example). 50 lines covers
  // everything the project documents today. The walk also breaks early on any
  // non-comment, non-blank line so the cap rarely matters in practice.
  const LOOKBACK_MAX = 50;
  const start = Math.max(0, lineIndex - LOOKBACK_MAX);
  for (let i = lineIndex - 1; i >= start; i--) {
    const trimmed = lines[i].trimEnd();

    // Blank lines between comment and signature are transparent.
    if (trimmed === '') continue;

    // Block-comment continuation/closing lines are transparent: keep walking.
    if (BLOCK_COMMENT_CLOSE.test(trimmed) || BLOCK_COMMENT_CONT.test(trimmed)) continue;

    // Found a real line — check whether it is a comment opener.
    if (commentPattern.test(trimmed)) return true;

    // Non-blank, non-comment line: no doc comment present.
    break;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Analyzes a source file for missing documentation comments.
 *
 * @param {string} filePath - Absolute or relative path to the file (used for extension detection).
 * @param {string} content  - Full text content of the file.
 * @returns {{
 *   language: string,
 *   missing: Array<{line: number, type: string, name: string}>,
 *   total: number,
 *   documented: number,
 *   coverage: number,
 * }}
 */
export function checkComments(filePath, content) {
  const ext = getFileExtension(filePath);
  const language = LANG_MAP[ext] ?? null;

  // Return a neutral result for unsupported or config files.
  if (!language || CONFIG_EXTS.has(ext)) {
    return { language: language ?? 'unknown', missing: [], total: 0, documented: 0, coverage: 100 };
  }

  const lines = content.split('\n');
  const commentPattern = COMMENT_ABOVE[language];
  const matchers = getMatchers(language);

  /** @type {Array<{line: number, type: string, name: string}>} */
  const missing = [];
  let total = 0;
  let documented = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const matcher of matchers) {
      const match = matcher.pattern.exec(line);
      if (!match) continue;

      const name = match[matcher.nameGroup];
      if (!name) continue;

      // Apply optional per-matcher skip predicate.
      if (matcher.skip && matcher.skip(name, line)) continue;

      // Skip identifiers starting with _ or # (private/internal).
      if (name.startsWith('_') || name.startsWith('#')) continue;

      // Skip lines that contain the `private` keyword (catches most languages).
      if (/\bprivate\b/.test(line)) continue;

      total++;

      if (hasCommentAbove(lines, i, commentPattern)) {
        documented++;
      } else {
        missing.push({ line: i + 1, type: matcher.type, name });
      }

      // Don't double-count the same line across multiple matchers.
      break;
    }
  }

  const coverage = total === 0 ? 100 : Math.round((documented / total) * 100);

  return { language, missing, total, documented, coverage };
}
