/**
 * canvas-preview.mjs
 * Preview plan builder for canvas preview system.
 * Builds a plan object describing how to preview a file (URL, port, framework detection).
 * Does NOT call MCP tools or open browser — plan execution is responsibility of SKILL.md.
 */

import { existsSync, readFileSync } from 'fs';
import { join, extname, resolve } from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely read and parse JSON file.
 * @param {string} filePath - Absolute path to JSON file
 * @returns {object|null} Parsed object or null on any error
 */
function readJsonSafe(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Check if a package.json dependency object contains a given package name.
 * @param {object} deps - dependency object from package.json
 * @param {string} packageName - package name to search for
 * @returns {boolean}
 */
function hasDependency(deps, packageName) {
  if (!deps || typeof deps !== 'object') return false;
  return packageName in deps;
}

// ---------------------------------------------------------------------------
// buildPlan
// ---------------------------------------------------------------------------

/**
 * Build a preview plan object describing how to preview a file.
 *
 * Detects framework from package.json dependencies and returns appropriate
 * preview configuration (URL, port, wait condition, framework type).
 * Falls back gracefully for static HTML files and non-framework projects.
 *
 * @param {string} filePath - Absolute path to file to preview
 * @param {string} [projectRoot] - Project root directory (defaults to process.cwd())
 * @returns {{
 *   url: string,              // file:// or http://localhost:PORT/...
 *   port?: number,            // present for dev-server frameworks
 *   waitFor: string,          // "load" | "networkidle" | text search pattern
 *   framework: 'static' | 'vite' | 'next' | 'cra' | 'none',
 *   fallback?: 'file-path-only'   // set when no framework detected and file is not HTML
 * }}
 */
export function buildPlan(filePath, projectRoot) {
  // Default projectRoot to current working directory
  const root = projectRoot || process.cwd();

  // Resolve to absolute path if not already
  const absPath = resolve(filePath);

  // Get file extension
  const ext = extname(absPath).toLowerCase();

  // --- Static HTML detection ---
  if (ext === '.html' || ext === '.htm') {
    return {
      url: `file://${absPath}`,
      framework: 'static',
      waitFor: 'load',
    };
  }

  // --- Read package.json from project root ---
  const packageJsonPath = join(root, 'package.json');
  const packageJson = readJsonSafe(packageJsonPath);

  // If no package.json, try fallback
  if (!packageJson) {
    return {
      url: `file://${absPath}`,
      framework: 'none',
      fallback: 'file-path-only',
      waitFor: 'load',
    };
  }

  // --- Framework detection from dependencies ---
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};

  // Check for Next.js
  if (hasDependency(dependencies, 'next')) {
    return {
      url: 'http://localhost:3000',
      port: 3000,
      framework: 'next',
      waitFor: 'networkidle',
    };
  }

  // Check for Vite
  if (hasDependency(devDependencies, 'vite')) {
    return {
      url: 'http://localhost:5173',
      port: 5173,
      framework: 'vite',
      waitFor: 'networkidle',
    };
  }

  // Check for Create React App (react-scripts)
  if (hasDependency(dependencies, 'react-scripts')) {
    return {
      url: 'http://localhost:3000',
      port: 3000,
      framework: 'cra',
      waitFor: 'networkidle',
    };
  }

  // --- No framework matched ---
  return {
    url: `file://${absPath}`,
    framework: 'none',
    fallback: 'file-path-only',
    waitFor: 'load',
  };
}
