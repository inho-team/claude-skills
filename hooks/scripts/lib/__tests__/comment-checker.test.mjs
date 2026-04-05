#!/usr/bin/env node

/**
 * comment-checker.test.mjs
 * Test suite for comment-checker.mjs
 * Run with: node hooks/scripts/lib/__tests__/comment-checker.test.mjs
 */

import { checkComments, isCheckableFile } from '../comment-checker.mjs';
import assert from 'assert';

// Track test results
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
    failCount++;
  }
}

// ============================================================================
// Test Group 1: isCheckableFile
// ============================================================================

test('isCheckableFile: TypeScript file', () => {
  assert.strictEqual(isCheckableFile('test.ts'), true);
  assert.strictEqual(isCheckableFile('example.tsx'), true);
});

test('isCheckableFile: JavaScript file', () => {
  assert.strictEqual(isCheckableFile('script.js'), true);
  assert.strictEqual(isCheckableFile('module.mjs'), true);
});

test('isCheckableFile: Python file', () => {
  assert.strictEqual(isCheckableFile('script.py'), true);
});

test('isCheckableFile: Go file', () => {
  assert.strictEqual(isCheckableFile('main.go'), true);
});

test('isCheckableFile: Java file', () => {
  assert.strictEqual(isCheckableFile('Service.java'), true);
});

test('isCheckableFile: Config files (should be false)', () => {
  assert.strictEqual(isCheckableFile('config.json'), false);
  assert.strictEqual(isCheckableFile('config.yaml'), false);
  assert.strictEqual(isCheckableFile('settings.yml'), false);
  assert.strictEqual(isCheckableFile('data.xml'), false);
  assert.strictEqual(isCheckableFile('.env'), false);
});

test('isCheckableFile: Unsupported extensions', () => {
  assert.strictEqual(isCheckableFile('readme.md'), false);
  assert.strictEqual(isCheckableFile('data.csv'), false);
});

// ============================================================================
// Test Group 2: TypeScript — Basic cases
// ============================================================================

test('TypeScript: documented function with JSDoc', () => {
  const code = `
/** Fetches a user by ID */
export function fetchUser(id: string): Promise<User> {
  return api.get(id);
}
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.language, 'typescript');
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 1);
  assert.strictEqual(result.missing.length, 0);
});

test('TypeScript: undocumented function', () => {
  const code = `
export function fetchUser(id: string): Promise<User> {
  return api.get(id);
}
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 0);
  assert.strictEqual(result.missing.length, 1);
  assert.strictEqual(result.missing[0].name, 'fetchUser');
  assert.strictEqual(result.missing[0].type, 'function');
});

test('TypeScript: mixed documented and undocumented', () => {
  const code = `
/** Documented */
export function funcA() {}

export function funcB() {}

/** Documented */
export function funcC() {}
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.total, 3);
  assert.strictEqual(result.documented, 2);
  assert.strictEqual(result.missing.length, 1);
  assert.strictEqual(result.missing[0].name, 'funcB');
  assert.ok(result.coverage >= 65 && result.coverage <= 68, `Expected coverage ~67%, got ${result.coverage}%`);
});

// ============================================================================
// Test Group 3: TypeScript — Classes
// ============================================================================

test('TypeScript: documented class', () => {
  const code = `
/** User service */
export class UserService {
  async getAll() {}
}
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 1);
  assert.strictEqual(result.missing.length, 0);
});

test('TypeScript: undocumented class', () => {
  const code = `
export class UserService {
  async getAll() {}
}
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 0);
  assert.strictEqual(result.missing[0].name, 'UserService');
  assert.strictEqual(result.missing[0].type, 'class');
});

// ============================================================================
// Test Group 4: TypeScript — Async and export combinations
// ============================================================================

test('TypeScript: async function', () => {
  const code = `
/** Async handler */
export async function handleRequest(req: Request): Promise<Response> {
  return { ok: true };
}
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 1);
});

test('TypeScript: non-exported function', () => {
  const code = `
/** Helper function */
function helper() {}
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 1);
});

// ============================================================================
// Test Group 5: Python — Basic cases
// ============================================================================

test('Python: documented function with comment above', () => {
  const code = `
# Fetch user by ID
def fetch_user(user_id: str) -> dict:
    return db.get(user_id)
`;
  const result = checkComments('test.py', code);
  assert.strictEqual(result.language, 'python');
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 1);
  assert.strictEqual(result.missing.length, 0);
});

test('Python: undocumented function', () => {
  const code = `
def fetch_user(user_id: str) -> dict:
    return db.get(user_id)
`;
  const result = checkComments('test.py', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 0);
  assert.strictEqual(result.missing.length, 1);
  assert.strictEqual(result.missing[0].name, 'fetch_user');
});

test('Python: documented class', () => {
  const code = `
# User service
class UserService:
    pass
`;
  const result = checkComments('test.py', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 1);
});

test('Python: private function (should skip)', () => {
  const code = `
def _internal_helper():
    pass
`;
  const result = checkComments('test.py', code);
  assert.strictEqual(result.total, 0);
  assert.strictEqual(result.missing.length, 0);
});

test('Python: async function', () => {
  const code = `
# Fetch data asynchronously
async def fetch_data():
    return await api.call()
`;
  const result = checkComments('test.py', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 1);
});

// ============================================================================
// Test Group 6: Go — Basic cases
// ============================================================================

test('Go: documented function with comment', () => {
  const code = `
// FetchUser retrieves a user by ID.
func FetchUser(id string) (*User, error) {
    return db.Get(id)
}
`;
  const result = checkComments('test.go', code);
  assert.strictEqual(result.language, 'go');
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 1);
  assert.strictEqual(result.missing.length, 0);
});

test('Go: undocumented exported function (uppercase)', () => {
  const code = `
func FetchUser(id string) (*User, error) {
    return db.Get(id)
}
`;
  const result = checkComments('test.go', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 0);
  assert.strictEqual(result.missing.length, 1);
  assert.strictEqual(result.missing[0].name, 'FetchUser');
});

test('Go: unexported function (lowercase, should skip)', () => {
  const code = `
func fetchUser(id string) (*User, error) {
    return db.Get(id)
}
`;
  const result = checkComments('test.go', code);
  assert.strictEqual(result.total, 0, 'Unexported functions should not be counted');
  assert.strictEqual(result.missing.length, 0);
});

test('Go: method receiver', () => {
  const code = `
// GetID returns the user ID.
func (u *User) GetID() string {
    return u.id
}
`;
  const result = checkComments('test.go', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 1);
});

// ============================================================================
// Test Group 7: Java — Basic cases
// ============================================================================

test('Java: documented class', () => {
  const code = `
/** User service */
public class UserService {
    /** Fetch user */
    public User fetchUser(String id) {
        return repo.findById(id);
    }
}
`;
  const result = checkComments('Test.java', code);
  assert.strictEqual(result.language, 'java');
  assert.strictEqual(result.total, 2);
  assert.strictEqual(result.documented, 2);
  assert.strictEqual(result.missing.length, 0);
});

test('Java: undocumented public method', () => {
  const code = `
public class UserService {
    public User fetchUser(String id) {
        return repo.findById(id);
    }
}
`;
  const result = checkComments('Test.java', code);
  assert.strictEqual(result.total, 2);
  assert.strictEqual(result.documented, 0);
  assert.strictEqual(result.missing.length, 2);
});

test('Java: protected method (should be checked)', () => {
  const code = `
/** Protected helper */
protected void helper() {}
`;
  const result = checkComments('Test.java', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 1);
});

// ============================================================================
// Test Group 8: Python/Java — Triple-quote and block comments
// ============================================================================

test('Python: triple-quote comment above', () => {
  const code = `
"""
Multi-line comment
spans several lines
"""
def function_name():
    pass
`;
  const result = checkComments('test.py', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 1);
});

test('Java: block comment with multi-line', () => {
  const code = `
/**
 * Javadoc comment
 * spans multiple lines
 */
public void method() {}
`;
  const result = checkComments('Test.java', code);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.documented, 1);
});

// ============================================================================
// Test Group 9: Coverage calculation
// ============================================================================

test('Coverage: 100% documented', () => {
  const code = `
/** A */
export function a() {}

/** B */
export function b() {}
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.coverage, 100);
});

test('Coverage: 0% documented', () => {
  const code = `
export function a() {}
export function b() {}
export function c() {}
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.coverage, 0);
});

test('Coverage: 50% documented', () => {
  const code = `
/** A */
export function a() {}

export function b() {}
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.coverage, 50);
});

// ============================================================================
// Test Group 10: Edge cases
// ============================================================================

test('Empty file', () => {
  const result = checkComments('test.ts', '');
  assert.strictEqual(result.total, 0);
  assert.strictEqual(result.documented, 0);
  assert.strictEqual(result.coverage, 100);
});

test('File with only comments', () => {
  const code = `
// This is a comment
// Another comment
/* Block comment */
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.total, 0);
  assert.strictEqual(result.documented, 0);
});

test('Config file (should return neutral result)', () => {
  const result = checkComments('config.json', '{"key": "value"}');
  assert.strictEqual(result.language, 'unknown');
  assert.strictEqual(result.total, 0);
  assert.strictEqual(result.documented, 0);
  assert.strictEqual(result.coverage, 100);
});

test('Unsupported file type', () => {
  const result = checkComments('readme.md', '# Title\n\nContent');
  assert.strictEqual(result.language, 'unknown');
  assert.strictEqual(result.total, 0);
  assert.strictEqual(result.documented, 0);
});

// ============================================================================
// Test Group 11: Private / skip patterns
// ============================================================================

test('TypeScript: private keyword (should skip)', () => {
  const code = `
private function helper() {}
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.total, 0);
});

test('JavaScript: underscore prefix (should skip)', () => {
  const code = `
export function _privateFunc() {}
`;
  const result = checkComments('test.js', code);
  assert.strictEqual(result.total, 0);
});

// ============================================================================
// Test Group 12: Line number accuracy
// ============================================================================

test('Line numbers in missing array', () => {
  const code = `
export function first() {}

export function second() {}
`;
  const result = checkComments('test.ts', code);
  assert.strictEqual(result.missing.length, 2);
  assert.strictEqual(result.missing[0].line, 2);
  assert.strictEqual(result.missing[1].line, 4);
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n${'='.repeat(70)}`);
console.log(`Test Results: ${passCount} passed, ${failCount} failed`);
console.log(`${'='.repeat(70)}`);

if (failCount > 0) {
  process.exit(1);
}
