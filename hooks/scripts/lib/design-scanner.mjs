/**
 * design-scanner.mjs
 * Design token scanner for the qe-framework.
 * Extracts tokens from tailwind config and scans component files for implicit tokens.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.qe']);

const COMPONENT_EXTS = new Set(['.tsx', '.jsx', '.vue', '.svelte']);

const SOURCE_DIRS = ['src', 'app', 'components'];

const MAX_FILES = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read file safely; return null on any error.
 * @param {string} absPath
 * @returns {string|null}
 */
function readFileOrNull(absPath) {
  try {
    return readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Recursively collect component files from a directory.
 * Walks directory tree, respecting SKIP_DIRS, up to MAX_FILES limit.
 * @param {string} dir - Absolute path to search
 * @param {string[]} [results] - Accumulator array
 * @returns {string[]} Absolute paths to component files
 */
function collectComponentFiles(dir, results = []) {
  if (results.length >= MAX_FILES) return results;

  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (results.length >= MAX_FILES) break;

    const abs = join(dir, entry);

    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) {
        collectComponentFiles(abs, results);
      }
    } else if (stat.isFile() && COMPONENT_EXTS.has(extname(entry).toLowerCase())) {
      results.push(abs);
    }
  }

  return results;
}

/**
 * Extract tokens from a tailwind config object block via regex.
 * Handles nested objects and quoted/unquoted keys.
 * Gracefully returns empty object if block not found.
 * @param {string} configContent - Raw config file content
 * @param {string} blockName - Block name (e.g., 'colors', 'spacing')
 * @returns {Object<string, any>} Extracted token map
 */
function extractTokenBlock(configContent, blockName) {
  const tokens = {};

  // Pattern: blockName: { ... } with basic token extraction
  const blockPattern = new RegExp(
    `${blockName}\\s*:\\s*\\{([^}]*)\\}`,
    's'
  );

  const match = configContent.match(blockPattern);
  if (!match) return tokens;

  const blockContent = match[1];

  // Extract key-value pairs: "key": value or key: value
  // Value matcher priority: array (['a', 'b']) → quoted string → until , or }
  const pairPattern = /['"]?([a-zA-Z0-9_-]+)['"]?\s*:\s*(\[[^\]]*\]|['"][^'"]*['"]|[^,}]+)/g;
  let pairMatch;

  while ((pairMatch = pairPattern.exec(blockContent)) !== null) {
    const key = pairMatch[1];
    let value = pairMatch[2].trim();

    // Clean up quoted values
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    tokens[key] = value;
  }

  return tokens;
}

/**
 * Extract all tailwind config tokens from a config file.
 * Looks for colors, spacing, and typography in both root and theme/extend blocks.
 * Returns empty token object if file not readable.
 * @param {string} configPath - Absolute path to tailwind config file
 * @returns {Object<string, Object>} Token structure {colors, spacing, typography}
 */
function extractTailwindTokens(configPath) {
  const content = readFileOrNull(configPath);
  if (!content) {
    return { colors: {}, spacing: {}, typography: {} };
  }

  const result = { colors: {}, spacing: {}, typography: {} };

  // Try direct block extraction
  result.colors = extractTokenBlock(content, 'colors');
  result.spacing = extractTokenBlock(content, 'spacing');

  // Extract typography (fontFamily + fontSize)
  const fontFamilyTokens = extractTokenBlock(content, 'fontFamily');
  const fontSizeTokens = extractTokenBlock(content, 'fontSize');
  result.typography = { ...fontFamilyTokens, ...fontSizeTokens };

  // If theme/extend blocks exist, try to extract from them
  if (content.includes('theme') || content.includes('extend')) {
    // Simple heuristic: if we got empty colors from root, try theme block
    if (Object.keys(result.colors).length === 0) {
      const themePattern = /theme\s*:\s*\{([\s\S]*?)\}/;
      const themeMatch = content.match(themePattern);
      if (themeMatch) {
        const themeContent = themeMatch[1];
        // Look for colors inside theme
        const colorPattern = /colors\s*:\s*\{([^}]*)\}/;
        const colorMatch = themeContent.match(colorPattern);
        if (colorMatch) {
          const pairPattern = /['"]?([a-zA-Z0-9_-]+)['"]?\s*:\s*(['"][^'"]*['"]|[^,}]+)/g;
          let pairMatch;
          while ((pairMatch = pairPattern.exec(colorMatch[1])) !== null) {
            let value = pairMatch[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            result.colors[pairMatch[1]] = value;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Extract className string literals from component content.
 * Matches both className and class attributes in JSX/Vue/Svelte syntax.
 * @param {string} content - File content
 * @returns {string[]} List of extracted className tokens
 */
function extractClassNames(content) {
  const tokens = [];

  // Match className="..." or className='...'
  const classNamePattern = /className\s*=\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = classNamePattern.exec(content)) !== null) {
    const classes = match[1].split(/\s+/).filter(Boolean);
    tokens.push(...classes);
  }

  // Also match class="..." for Vue/Svelte
  const classPattern = /\bclass\s*=\s*['"]([^'"]+)['"]/g;
  while ((match = classPattern.exec(content)) !== null) {
    const classes = match[1].split(/\s+/).filter(Boolean);
    tokens.push(...classes);
  }

  return tokens;
}

/**
 * Get the top N tokens by frequency.
 * Counts token occurrences and returns most frequent ones first.
 * @param {string[]} tokens - List of tokens
 * @param {number} limit - Max results (default: 30)
 * @returns {string[]} Sorted tokens by frequency descending
 */
function topTokensByFrequency(tokens, limit = 30) {
  const freq = {};
  for (const token of tokens) {
    freq[token] = (freq[token] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

// ---------------------------------------------------------------------------
// scan
// ---------------------------------------------------------------------------

/**
 * Scan a project for design tokens.
 *
 * Extracts tokens from tailwind config (colors, spacing, typography) and
 * scans component files for implicit high-frequency className tokens.
 *
 * @param {string} projectRoot - Project root directory
 * @returns {{
 *   tokens: {colors: Object<string, any>, spacing: Object<string, any>, typography: Object<string, any>},
 *   implicit: string[]
 * }}
 */
export function scan(projectRoot) {
  const result = {
    tokens: {
      colors: {},
      spacing: {},
      typography: {},
    },
    implicit: [],
  };

  try {
    // 1. Try to extract tokens from tailwind config
    const tailwindConfigNames = [
      'tailwind.config.js',
      'tailwind.config.mjs',
      'tailwind.config.cjs',
      'tailwind.config.ts',
    ];

    for (const name of tailwindConfigNames) {
      const configPath = join(projectRoot, name);
      if (existsSync(configPath)) {
        result.tokens = extractTailwindTokens(configPath);
        break;
      }
    }

    // 2. Scan component files for implicit tokens
    const componentTokens = [];

    for (const sourceDir of SOURCE_DIRS) {
      const absDir = join(projectRoot, sourceDir);
      if (!existsSync(absDir)) continue;

      const componentFiles = collectComponentFiles(absDir);

      for (const filePath of componentFiles) {
        const content = readFileOrNull(filePath);
        if (content === null) continue;

        const classNames = extractClassNames(content);
        componentTokens.push(...classNames);
      }

      if (componentTokens.length >= MAX_FILES * 10) break;
    }

    // 3. Get top 30 tokens by frequency
    result.implicit = topTokensByFrequency(componentTokens, 30);
  } catch {
    // Never crash — return default structure
  }

  return result;
}
