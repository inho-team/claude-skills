#!/usr/bin/env node
'use strict';

/**
 * Contract Manifest — File-listing and name-validation utilities for .qe/contracts/.
 * Validates contract names, resolves contract paths, and lists active/pending contracts.
 */

import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Validate a contract name: alphanumeric, hyphen, underscore only.
 * Rejects path separators and parent-directory traversal.
 * @param {string} name
 * @returns {boolean}
 */
export function isValidContractName(name) {
  if (!name || typeof name !== 'string' || name.length === 0 || name.length > 64) {
    return false;
  }
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Throw if name is invalid — use at entry points that turn name into a path.
 * @param {string} name
 * @throws {Error} if invalid
 */
export function assertValidContractName(name) {
  if (!isValidContractName(name)) {
    throw new Error(`Invalid contract name: ${name}`);
  }
}

/**
 * Resolve contract path. Search order: active/ first, then pending/.
 * @param {string} name
 * @param {string} [baseDir] — defaults to process.cwd()
 * @returns {{path: string, state: 'active'|'pending'} | null}
 */
export function resolveContractPath(name, baseDir) {
  assertValidContractName(name);
  const base = baseDir || process.cwd();

  const activePath = path.join(base, '.qe/contracts/active', name + '.md');
  if (existsSync(activePath)) {
    return { path: activePath, state: 'active' };
  }

  const pendingPath = path.join(base, '.qe/contracts/pending', name + '.md');
  if (existsSync(pendingPath)) {
    return { path: pendingPath, state: 'pending' };
  }

  return null;
}

/**
 * List contract names (without .md extension) in active/.
 * Excludes TEMPLATE.md, README.md, and anything starting with '.'.
 * @param {string} [baseDir]
 * @returns {string[]}
 */
export function listActive(baseDir) {
  const base = baseDir || process.cwd();
  const dir = path.join(base, '.qe/contracts/active');

  if (!existsSync(dir)) {
    return [];
  }

  try {
    const files = readdirSync(dir).filter((file) => {
      // Skip directories
      if (!file.endsWith('.md')) {
        return false;
      }
      // Skip hidden files
      if (file.startsWith('.')) {
        return false;
      }
      // Skip template and readme
      if (file === 'TEMPLATE.md' || file === 'README.md') {
        return false;
      }
      return true;
    });

    return files.map((f) => f.replace(/\.md$/, '')).sort();
  } catch {
    return [];
  }
}

/**
 * List contract names in pending/.
 * @param {string} [baseDir]
 * @returns {string[]}
 */
export function listPending(baseDir) {
  const base = baseDir || process.cwd();
  const dir = path.join(base, '.qe/contracts/pending');

  if (!existsSync(dir)) {
    return [];
  }

  try {
    const files = readdirSync(dir).filter((file) => {
      // Skip directories
      if (!file.endsWith('.md')) {
        return false;
      }
      // Skip hidden files
      if (file.startsWith('.')) {
        return false;
      }
      return true;
    });

    return files.map((f) => f.replace(/\.md$/, '')).sort();
  } catch {
    return [];
  }
}

/**
 * Check whether a contract exists (in active/ or pending/).
 * @param {string} name
 * @param {string} [baseDir]
 * @returns {boolean}
 */
export function contractExists(name, baseDir) {
  return resolveContractPath(name, baseDir) !== null;
}
