// Adapted from oh-my-claudecode (MIT, © 2025 Yeachan Heo).
// See https://github.com/Yeachan-Heo/oh-my-claudecode for original.
'use strict';

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, statSync, openSync, readSync, closeSync } from 'fs';
import { join, dirname } from 'path';
import { randomBytes } from 'crypto';

const BLOCKS_FILE = 'context-blocks.json';
const TAIL_BYTES = 8192; // read last 8 KB of transcript for efficiency

/**
 * Atomic JSON write.
 * @param {string} filePath
 * @param {object} data
 */
function atomicWrite(filePath, data) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.tmp-${randomBytes(6).toString('hex')}.json`);
  try {
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    renameSync(tmp, filePath);
  } catch (err) {
    try { unlinkSync(tmp); } catch {}
    throw err;
  }
}

/**
 * Read blocks map from disk.
 * @param {string} stateDir
 * @returns {{ [sessionId: string]: number }}
 */
function readBlocks(stateDir) {
  const filePath = join(stateDir, BLOCKS_FILE);
  if (!existsSync(filePath)) return {};
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Write blocks map to disk.
 * @param {string} stateDir
 * @param {object} blocks
 */
function writeBlocks(stateDir, blocks) {
  atomicWrite(join(stateDir, BLOCKS_FILE), blocks);
}

/**
 * Estimate the context usage ratio (0..1) by reading the transcript file.
 * Uses chars/4 heuristic to estimate token count.
 *
 * Falls back to 0 if the file does not exist or cannot be read.
 *
 * @param {string} transcriptPath - Path to the Claude Code transcript file.
 * @param {number} [modelLimit=200000] - Max token limit for the model.
 * @returns {number} Ratio between 0 and 1.
 */
export function estimateUsageRatio(transcriptPath, modelLimit = 200000) {
  if (!transcriptPath || !existsSync(transcriptPath)) return 0;
  try {
    const stat = statSync(transcriptPath);
    const readLength = Math.min(TAIL_BYTES, stat.size);
    const position = stat.size - readLength;
    const buf = Buffer.alloc(readLength);
    const fd = openSync(transcriptPath, 'r');
    try {
      readSync(fd, buf, 0, readLength, position);
    } finally {
      closeSync(fd);
    }
    const tail = buf.toString('utf8');

    // Prefer explicit context_window/input_tokens fields if present in tail
    const cwMatch = tail.match(/"context_window"\s*:\s*(\d+)/);
    const itMatch = tail.match(/"input_tokens"\s*:\s*(\d+)/);
    if (cwMatch && itMatch) {
      const contextWindow = parseInt(cwMatch[1], 10);
      const inputTokens = parseInt(itMatch[1], 10);
      if (contextWindow > 0) return Math.min(inputTokens / contextWindow, 1);
    }

    // Fallback: estimate via full file char count / 4
    const fullContent = readFileSync(transcriptPath, 'utf8');
    const estimatedTokens = Math.ceil(fullContent.length / 4);
    return Math.min(estimatedTokens / modelLimit, 1);
  } catch {
    return 0;
  }
}

/**
 * Increment the block count for a session and return the new count.
 *
 * @param {string} sessionId
 * @param {string} stateDir
 * @returns {number} New block count.
 */
export function recordBlock(sessionId, stateDir) {
  const blocks = readBlocks(stateDir);
  blocks[sessionId] = (blocks[sessionId] ?? 0) + 1;
  writeBlocks(stateDir, blocks);
  return blocks[sessionId];
}

/**
 * Reset block counter for a session.
 *
 * @param {string} sessionId
 * @param {string} stateDir
 */
export function resetBlocks(sessionId, stateDir) {
  const blocks = readBlocks(stateDir);
  delete blocks[sessionId];
  writeBlocks(stateDir, blocks);
}

/**
 * Get the current block count for a session (0 if not found).
 *
 * @param {string} sessionId
 * @param {string} stateDir
 * @returns {number}
 */
export function getBlockCount(sessionId, stateDir) {
  const blocks = readBlocks(stateDir);
  return blocks[sessionId] ?? 0;
}
