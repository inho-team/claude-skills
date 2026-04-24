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
 *
 * Walks tail JSONL lines in reverse and returns the ratio from the most
 * recent assistant `message.usage` entry. Does NOT fall back to whole-file
 * char counts — the transcript is append-only and grows past the live
 * context window, so summing the entire file over-counts historical turns
 * and pins the reading at 100% for the rest of the session.
 *
 * @param {string} transcriptPath - Path to the Claude Code transcript file.
 * @param {number} [modelLimit] - Max token limit; defaults to QE_CONTEXT_LIMIT env or 200000.
 * @returns {number} Ratio between 0 and 1. Returns 0 if no usage entry found.
 */
export function estimateUsageRatio(transcriptPath, modelLimit) {
  if (!transcriptPath || !existsSync(transcriptPath)) return 0;
  const limit = modelLimit ?? parseInt(process.env.QE_CONTEXT_LIMIT || '200000', 10);
  try {
    const stat = statSync(transcriptPath);
    let readLength = Math.min(TAIL_BYTES, stat.size);
    let position = stat.size - readLength;
    let tail = readTail(transcriptPath, position, readLength);

    // Expand window once if the tail doesn't contain any usage block.
    if (!/"usage"\s*:/.test(tail) && stat.size > TAIL_BYTES) {
      readLength = Math.min(TAIL_BYTES * 8, stat.size);
      position = stat.size - readLength;
      tail = readTail(transcriptPath, position, readLength);
    }

    // Walk lines end-to-start. The first line of `tail` may be cut mid-line
    // at the byte-window boundary — malformed entries are simply skipped.
    const lines = tail.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line || line[0] !== '{') continue;
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      const usage = entry?.message?.usage;
      if (!usage) continue;
      const tokens = (usage.input_tokens ?? 0)
        + (usage.cache_read_input_tokens ?? 0)
        + (usage.cache_creation_input_tokens ?? 0);
      if (tokens <= 0) continue;
      return Math.min(tokens / limit, 1);
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Read `length` bytes from `filePath` starting at byte `position`.
 * @param {string} filePath
 * @param {number} position
 * @param {number} length
 * @returns {string} UTF-8 decoded slice.
 */
function readTail(filePath, position, length) {
  const buf = Buffer.alloc(length);
  const fd = openSync(filePath, 'r');
  try {
    readSync(fd, buf, 0, length, position);
  } finally {
    closeSync(fd);
  }
  return buf.toString('utf8');
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
