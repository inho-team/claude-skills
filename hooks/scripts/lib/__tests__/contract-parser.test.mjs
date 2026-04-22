import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseContract } from '../contract-parser.mjs';
import { validateContract } from '../contract-validator.mjs';

// ============================================================================
// PARSER TESTS
// ============================================================================

test('Parser: parseContract(full valid markdown) returns all 6 keys populated', () => {
  const markdown = `
## Signature
function doWork(input: string): Promise<void>

## Purpose
Performs the primary work task.

## Constraints
Must complete within 5 seconds.

## Flow
1. Validate input
2. Execute work
3. Return result

## Invariants
State is never corrupted.

## Error Modes
Throws on invalid input.
`;

  const result = parseContract(markdown);
  assert.deepStrictEqual(typeof result.signature, 'string');
  assert.deepStrictEqual(typeof result.purpose, 'string');
  assert.deepStrictEqual(typeof result.constraints, 'string');
  assert.deepStrictEqual(typeof result.flow, 'string');
  assert.deepStrictEqual(typeof result.invariants, 'string');
  assert.deepStrictEqual(typeof result.errorModes, 'string');

  // Verify trimming
  assert.match(result.signature, /^function doWork/);
  assert.match(result.purpose, /^Performs the primary/);
});

test('Parser: parseContract("") returns all 6 keys as null (no throw)', () => {
  const result = parseContract('');
  assert.strictEqual(result.signature, null);
  assert.strictEqual(result.purpose, null);
  assert.strictEqual(result.constraints, null);
  assert.strictEqual(result.flow, null);
  assert.strictEqual(result.invariants, null);
  assert.strictEqual(result.errorModes, null);
});

test('Parser: parseContract("no headers at all") returns all 6 keys as null', () => {
  const result = parseContract('Just some random text without any headers');
  assert.strictEqual(result.signature, null);
  assert.strictEqual(result.purpose, null);
  assert.strictEqual(result.constraints, null);
  assert.strictEqual(result.flow, null);
  assert.strictEqual(result.invariants, null);
  assert.strictEqual(result.errorModes, null);
});

test('Parser: parseContract(duplicate ## Signature) uses FIRST occurrence', () => {
  const markdown = `
## Signature
function first(): void

## Purpose
First purpose

## Signature
function second(): void
`;

  const result = parseContract(markdown);
  assert.match(result.signature, /^function first/);
});

test('Parser: parseContract(## inside fenced code block) does NOT treat inner ## as header', () => {
  const markdown = `
## Signature
function doWork(): void

## Purpose
This section documents code:
\`\`\`
## NotAHeader
function nested(): void
\`\`\`
More documentation after.

## Invariants
No corrupted state.
`;

  const result = parseContract(markdown);
  assert.match(result.signature, /^function doWork/);
  assert.match(result.purpose, /This section documents code/);
  assert.match(result.purpose, /## NotAHeader/);
  assert.match(result.purpose, /function nested/);
  assert.match(result.purpose, /More documentation after/);
  assert.match(result.invariants, /^No corrupted/);
});

test('Parser: section headers are matched case-insensitively', () => {
  const markdown = `
## SIGNATURE
function doWork(): void

## signature
Duplicate (should be ignored as first wins)

## PURPOSE
Performs work.

## Constraints
No constraints.

## INVARIANTS
No state corruption.

## ERROR MODES
Throws on bad input.
`;

  const result = parseContract(markdown);
  assert.match(result.signature, /^function doWork/);
  assert.match(result.purpose, /^Performs work/);
  assert.match(result.constraints, /^No constraints/);
  assert.match(result.invariants, /^No state/);
  assert.match(result.errorModes, /^Throws/);
});

test('Parser: unknown sections (e.g., ## Notes) are ignored without error', () => {
  const markdown = `
## Signature
function doWork(): void

## Notes
This is a note that should be ignored.

## Purpose
Does the work.

## Random Section
This is also ignored.
`;

  const result = parseContract(markdown);
  assert.match(result.signature, /^function doWork/);
  assert.match(result.purpose, /^Does the work/);
  assert.strictEqual(result.constraints, null);
  assert.strictEqual(result.flow, null);
  assert.strictEqual(result.invariants, null);
  assert.strictEqual(result.errorModes, null);
});

// ============================================================================
// VALIDATOR TESTS
// ============================================================================

test('Validator: validateContract({all required populated, flow: null}) → {valid: true, missing: []}', () => {
  const contract = {
    signature: 'function doWork(): void',
    purpose: 'Does the work',
    constraints: 'Must be fast',
    flow: null,
    invariants: 'No corruption',
    errorModes: 'Throws on bad input'
  };

  const result = validateContract(contract);
  assert.deepStrictEqual(result.valid, true);
  assert.deepStrictEqual(result.missing, []);
});

test('Validator: validateContract({missing purpose}) → {valid: false, missing: ["purpose"]}', () => {
  const contract = {
    signature: 'function doWork(): void',
    purpose: null,
    constraints: 'Must be fast',
    flow: null,
    invariants: 'No corruption',
    errorModes: 'Throws on bad input'
  };

  const result = validateContract(contract);
  assert.deepStrictEqual(result.valid, false);
  assert.deepStrictEqual(result.missing, ['purpose']);
});

test('Validator: validateContract({all null}) → {valid: false, missing: [all 5 required]} in deterministic order', () => {
  const contract = {
    signature: null,
    purpose: null,
    constraints: null,
    flow: null,
    invariants: null,
    errorModes: null
  };

  const result = validateContract(contract);
  assert.deepStrictEqual(result.valid, false);
  assert.deepStrictEqual(result.missing, ['signature', 'purpose', 'constraints', 'invariants', 'errorModes']);
});

test('Validator: validateContract({purpose: "   "}) treats whitespace-only as missing', () => {
  const contract = {
    signature: 'function doWork(): void',
    purpose: '   ',
    constraints: 'Must be fast',
    flow: null,
    invariants: 'No corruption',
    errorModes: 'Throws on bad input'
  };

  const result = validateContract(contract);
  assert.deepStrictEqual(result.valid, false);
  assert.deepStrictEqual(result.missing, ['purpose']);
});

test('Validator: validateContract(null) → {valid: false, missing: [all 5]} — no throw', () => {
  const result = validateContract(null);
  assert.deepStrictEqual(result.valid, false);
  assert.deepStrictEqual(result.missing, ['signature', 'purpose', 'constraints', 'invariants', 'errorModes']);
});

test('Validator: validateContract(undefined) → {valid: false, missing: [all 5]} — no throw', () => {
  const result = validateContract(undefined);
  assert.deepStrictEqual(result.valid, false);
  assert.deepStrictEqual(result.missing, ['signature', 'purpose', 'constraints', 'invariants', 'errorModes']);
});

// ============================================================================
// ROUND-TRIP TEST
// ============================================================================

test('Round-trip: Parse valid contract markdown → validate returns {valid: true}', () => {
  const markdown = `
## Signature
function processTask(input: TaskData): Promise<Result>

## Purpose
Processes incoming task data and returns a validated result.

## Constraints
Must complete processing within 10 seconds. Input must not exceed 1MB.

## Flow
1. Receive task data
2. Validate input structure
3. Transform data
4. Return result

## Invariants
Database state is never left in partial transaction.
No tasks are lost or duplicated.

## Error Modes
Throws TaskValidationError on invalid input.
Throws TimeoutError if processing exceeds time limit.
Logs and retries on transient network failures.
`;

  const parsed = parseContract(markdown);
  const result = validateContract(parsed);

  assert.deepStrictEqual(result.valid, true);
  assert.deepStrictEqual(result.missing, []);
  assert.ok(parsed.signature);
  assert.ok(parsed.purpose);
  assert.ok(parsed.constraints);
  assert.ok(parsed.invariants);
  assert.ok(parsed.errorModes);
});
