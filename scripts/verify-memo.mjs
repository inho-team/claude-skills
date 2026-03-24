#!/usr/bin/env node
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { readUnifiedState, writeUnifiedState, updateContextMemo, getContextMemo, invalidateContextMemo } from '../hooks/scripts/lib/state.mjs';

const cwd = process.cwd();
const testFile = join(cwd, 'memo-test.txt');
const testContent = 'Hello, ContextMemo!';

console.log('--- ContextMemo Verification ---');

// 1. Initial State
let state = readUnifiedState(cwd);
console.log('1. Initial state loaded.');

// 2. Update Memo
updateContextMemo(state, testFile, testContent);
writeUnifiedState(cwd, state);
console.log('2. Memo updated and state saved.');

// 3. Verify Hit
state = readUnifiedState(cwd);
const cached = getContextMemo(state, testFile);
if (cached === testContent) {
  console.log('3. [PASS] Memo hit confirmed.');
} else {
  console.error('3. [FAIL] Memo hit failed.');
  process.exit(1);
}

// 4. Invalidate Memo
invalidateContextMemo(state, testFile);
writeUnifiedState(cwd, state);
console.log('4. Memo invalidated and state saved.');

// 5. Verify Miss
state = readUnifiedState(cwd);
const missed = getContextMemo(state, testFile);
if (missed === null) {
  console.log('5. [PASS] Memo invalidation confirmed.');
} else {
  console.error('5. [FAIL] Memo invalidation failed.');
  process.exit(1);
}

console.log('--- Verification Complete: SUCCESS ---');
