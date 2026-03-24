#!/usr/bin/env node
'use strict';

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Get state directory path
 * @param {string} cwd - Project root
 * @param {string} [sessionId] - Optional session ID for isolation
 */
export function getStateDir(cwd, sessionId) {
  if (sessionId) {
    return join(cwd, '.qe', 'state', 'sessions', sessionId);
  }
  return join(cwd, '.qe', 'state');
}

/**
 * Atomic write JSON file (write to tmp, then rename)
 */
export function atomicWriteJson(filePath, data) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const tmpPath = join(dir, `.tmp-${randomBytes(6).toString('hex')}.json`);
  try {
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    renameSync(tmpPath, filePath);
  } catch (err) {
    // Cleanup tmp file on failure
    try { unlinkSync(tmpPath); } catch {}
    throw err;
  }
}

/**
 * Read state for a mode
 * @returns {object|null} State object or null if not found/stale
 */
export function readState(cwd, mode, sessionId) {
  const stateDir = getStateDir(cwd, sessionId);
  const filePath = join(stateDir, `${mode}-state.json`);

  if (!existsSync(filePath)) {
    // Fallback to legacy (non-session) path
    if (sessionId) {
      return readState(cwd, mode, null);
    }
    return null;
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    const state = JSON.parse(raw);

    // Staleness check
    if (state.started_at) {
      const age = Date.now() - new Date(state.started_at).getTime();
      if (age > STALE_MS) return null;
    }

    return state.active ? state : null;
  } catch {
    return null;
  }
}

/**
 * Write state for a mode
 */
export function writeState(cwd, mode, state, sessionId) {
  const stateDir = getStateDir(cwd, sessionId);
  const filePath = join(stateDir, `${mode}-state.json`);

  const data = {
    ...state,
    active: true,
    started_at: state.started_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    session_id: sessionId || state.session_id || 'unknown',
  };

  atomicWriteJson(filePath, data);
  return data;
}

/**
 * Clear state for a mode
 */
export function clearState(cwd, mode, sessionId) {
  const stateDir = getStateDir(cwd, sessionId);
  const filePath = join(stateDir, `${mode}-state.json`);

  if (existsSync(filePath)) {
    try { unlinkSync(filePath); } catch {}
  }

  // Also try legacy path
  if (sessionId) {
    const legacyPath = join(cwd, '.qe', 'state', `${mode}-state.json`);
    if (existsSync(legacyPath)) {
      try { unlinkSync(legacyPath); } catch {}
    }
  }
}

/**
 * Get unified state path
 */
export function getUnifiedStatePath(cwd) {
  return join(cwd, '.qe', 'state', 'unified-state.json');
}

/**
 * Read unified state (stats, intent, feedback, etc.)
 */
export function readUnifiedState(cwd) {
  const filePath = getUnifiedStatePath(cwd);
  if (!existsSync(filePath)) return {};

  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Write unified state atomically
 */
export function writeUnifiedState(cwd, state) {
  const filePath = getUnifiedStatePath(cwd);
  atomicWriteJson(filePath, state);
}

const MEMO_FILE_LIMIT = 10 * 1024; // 10KB
const MEMO_TOTAL_LIMIT = 100 * 1024; // 100KB

/**
 * Update ContextMemo with file content
 */
export function updateContextMemo(state, filePath, content) {
  if (!state.memo) state.memo = { files: {}, total_size: 0 };
  const memo = state.memo;

  if (content.length > MEMO_FILE_LIMIT) return;

  // Evict old entries if total size exceeded
  const contentSize = Buffer.byteLength(content, 'utf8');
  while (memo.total_size + contentSize > MEMO_TOTAL_LIMIT) {
    const firstKey = Object.keys(memo.files)[0];
    if (!firstKey) break;
    memo.total_size -= Buffer.byteLength(memo.files[firstKey], 'utf8');
    delete memo.files[firstKey];
  }

  memo.files[filePath] = content;
  memo.total_size += contentSize;
}

/**
 * Get ContextMemo for a file
 */
export function getContextMemo(state, filePath) {
  return state?.memo?.files?.[filePath] || null;
}

/**
 * Invalidate ContextMemo for a file
 */
export function invalidateContextMemo(state, filePath) {
  if (state?.memo?.files?.[filePath]) {
    state.memo.total_size -= Buffer.byteLength(state.memo.files[filePath], 'utf8');
    delete state.memo.files[filePath];
  }
}

/**
 * List all active modes
 */
export function listActiveModes(cwd, sessionId) {
  const stateDir = getStateDir(cwd, sessionId);
  if (!existsSync(stateDir)) return [];

  const active = [];
  try {
    const files = readdirSync(stateDir).filter(f => f.endsWith('-state.json'));
    for (const file of files) {
      const mode = file.replace('-state.json', '');
      const state = readState(cwd, mode, sessionId);
      if (state) {
        active.push({ mode, state });
      }
    }
  } catch {}

  return active;
}

/**
 * Read stdin JSON helper
 */
export function readStdinJson() {
  try {
    const input = readFileSync('/dev/stdin', 'utf8');
    return JSON.parse(input);
  } catch {
    return null;
  }
}

/**
 * Get CLAUDE.md path
 */
export function getClaudePath(cwd) {
  return join(cwd, 'CLAUDE.md');
}

/**
 * Parse CLAUDE.md task table into objects
 */
export function parseClaudeTaskTable(cwd) {
  const filePath = getClaudePath(cwd);
  if (!existsSync(filePath)) return [];

  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const tasks = [];
    let inTable = false;

    for (const line of lines) {
      if (line.includes('| Status | UUID |') || line.includes('| UUID | Status |')) {
        inTable = true;
        continue;
      }
      if (inTable && line.includes('|') && !line.includes('---')) {
        const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');
        // Standard format: | Status | UUID | Name | ...
        if (parts.length >= 2) {
          tasks.push({
            status: parts[0],
            uuid: parts[1],
            name: parts[2] || '',
            line: line
          });
        }
      } else if (inTable && line.trim() === '') {
        inTable = false;
      }
    }
    return tasks;
  } catch {
    return [];
  }
}

/**
 * Update task status in CLAUDE.md
 */
export function updateClaudeStatus(cwd, uuid, newStatus) {
  const filePath = getClaudePath(cwd);
  if (!existsSync(filePath)) return false;

  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let updated = false;

    const newLines = lines.map(line => {
      if (line.includes(`| ${uuid} |`) || line.includes(` ${uuid} `)) {
        const parts = line.split('|');
        if (parts.length >= 3) {
          // Find which column is status (usually 1 or 2)
          if (parts[1].trim().length <= 3) { // Status icon column
            parts[1] = ` ${newStatus} `;
          } else if (parts[2].trim().length <= 3) {
            parts[2] = ` ${newStatus} `;
          }
          updated = true;
          return parts.join('|');
        }
      }
      return line;
    });

    if (updated) {
      writeFileSync(filePath, newLines.join('\n'), 'utf8');
    }
    return updated;
  } catch {
    return false;
  }
}

/**
 * Get current working directory
 */
export function getCwd() {
  return process.cwd();
}
