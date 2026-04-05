---
name: Qvitest
description: Vitest fast unit testing framework powered by Vite with Jest-compatible API. Use when writing tests, mocking, configuring coverage, or working with test filtering and fixtures.
metadata: 
author: Anthony Fu
version: 2026.1.28
source: "Generated from https://github.com/vitest-dev/vitest, scripts located at https://github.com/antfu/skills"
invocation_trigger: When specialized language or framework best practices are needed.
recommendedModel: haiku
---

# Vitest Test Master

Vitest is a next-generation testing framework powered by Vite. It provides a Jest-compatible API with native ESM, TypeScript, and JSX support out of the box. Vitest shares the same config, transformers, resolvers, and plugins with your Vite app.

**Key Features:**
- Vite-native: Uses Vite's transformation pipeline for fast HMR-like test updates
- Jest-compatible: Drop-in replacement for most Jest test suites
- Smart watch mode: Only reruns affected tests based on module graph
- Native ESM, TypeScript, JSX support without configuration
- Multi-threaded workers for parallel test execution
- Built-in coverage via V8 or Istanbul
- Snapshot testing, mocking, and spy utilities

> The skill is based on Vitest 3.x, generated at 2026-01-28.

## Core

| Topic | Description | Reference |
|-------|-------------|-----------|
| Configuration | Vitest and Vite config integration, defineConfig usage | [core-config](references/core-config.md) |
| CLI | Command line interface, commands and options | [core-cli](references/core-cli.md) |
| Test API | test/it function, modifiers like skip, only, concurrent | [core-test-api](references/core-test-api.md) |
| Describe API | describe/suite for grouping tests and nested suites | [core-describe](references/core-describe.md) |
| Expect API | Assertions with toBe, toEqual, matchers and asymmetric matchers | [core-expect](references/core-expect.md) |
| Hooks | beforeEach, afterEach, beforeAll, afterAll, aroundEach | [core-hooks](references/core-hooks.md) |

## Features

| Topic | Description | Reference |
|-------|-------------|-----------|
| Mocking | Mock functions, modules, timers, dates with vi utilities | [features-mocking](references/features-mocking.md) |
| Snapshots | Snapshot testing with toMatchSnapshot and inline snapshots | [features-snapshots](references/features-snapshots.md) |
| Coverage | Code coverage with V8 or Istanbul providers | [features-coverage](references/features-coverage.md) |
| Test Context | Test fixtures, context.expect, test.extend for custom fixtures | [features-context](references/features-context.md) |
| Concurrency | Concurrent tests, parallel execution, sharding | [features-concurrency](references/features-concurrency.md) |
| Filtering | Filter tests by name, file patterns, tags | [features-filtering](references/features-filtering.md) |

## Advanced

| Topic | Description | Reference |
|-------|-------------|-----------|
| Vi Utilities | vi helper: mock, spyOn, fake timers, hoisted, waitFor | [advanced-vi](references/advanced-vi.md) |
| Environments | Test environments: node, jsdom, happy-dom, custom | [advanced-environments](references/advanced-environments.md) |
| Type Testing | Type-level testing with expectTypeOf and assertType | [advanced-type-testing](references/advanced-type-testing.md) |
| Projects | Multi-project workspaces, different configs per project | [advanced-projects](references/advanced-projects.md) |

## Code Patterns (3 Examples)

### Pattern 1: Organized Test Suite with Setup/Teardown
```typescript
/**
 * Unit tests for CartService with proper setup and isolation.
 * 
 * Tests verify: item addition, removal, tax calculation, and total.
 * All tests are isolated — cart state does not leak between tests.
 */
describe('CartService', () => {
  let cart: CartService;
  
  beforeEach(() => {
    // Setup fresh instance before each test
    cart = new CartService({ taxRate: 0.1 });
  });
  
  afterEach(() => {
    // Cleanup (if service has resources)
    vi.clearAllMocks();
  });
  
  describe('addItem()', () => {
    it('adds item to empty cart', () => {
      cart.addItem({ id: 1, name: 'Widget', price: 50 });
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].name).toBe('Widget');
    });
    
    it('increments quantity if item exists', () => {
      cart.addItem({ id: 1, name: 'Widget', price: 50 });
      cart.addItem({ id: 1, name: 'Widget', price: 50 });
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(2);
    });
  });
  
  describe('calculateTotal()', () => {
    it('includes tax in total', () => {
      cart.addItem({ id: 1, name: 'Widget', price: 100 });
      expect(cart.calculateTotal()).toBe(110); // 100 + 10% tax
    });
  });
});
```

### Pattern 2: Mocking with Vitest (No Secrets)
```typescript
// ✅ Mock API calls without exposing credentials
describe('UserService', () => {
  it('fetches user with mocked API', async () => {
    // Mock the fetch to avoid real API calls
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Alice', email: 'test@example.com' })
      })
    ));
    
    const user = await UserService.getUser(1);
    expect(user.name).toBe('Alice');
    
    // Verify mock was called with correct args
    expect(fetch).toHaveBeenCalledWith('/api/users/1');
  });
  
  // ✅ Verify no sensitive data in snapshots
  it('sanitizes output before logging', () => {
    const user = { id: 1, name: 'Alice', password: 'secret123' };
    const sanitized = UserService.sanitizeForLog(user);
    expect(sanitized).not.toHaveProperty('password');
  });
});
```

### Pattern 3: Coverage Configuration with Thresholds
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.spec.ts',
        '**/*.test.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});

// Run: npm run test -- --coverage
```

## Comment Template

Every test file should include JSDoc scope header:

```typescript
/**
 * Unit tests for AuthService password validation and token generation.
 *
 * Coverage:
 * - Password strength validation (min length, complexity)
 * - JWT token generation and expiration
 * - Credential hashing with bcrypt
 * - Failed attempt lockout logic
 *
 * Mocking: All API calls mocked; no real authentication servers contacted.
 * Security: No plaintext passwords in test code; uses test_user@example.com.
 * Performance: All tests run in parallel; < 5ms per test.
 */
```

## Lint Rules

Run these tools in CI to enforce quality:

```bash
# Type checking
npx tsc --noEmit

# Linting test files
npx eslint "**/*.spec.ts" --plugin vitest

# Run tests with coverage thresholds
npx vitest run --coverage --coverage-lines 80

# Validate config integrity
npx vitest config --inspect

# Check for test isolation issues
npx vitest run --reporter=verbose
```

## Security Checklist (5+)

- [ ] No hardcoded API keys, tokens, or passwords in test code
- [ ] Test credentials use fake/test email addresses (test@example.com, testuser_xxx)
- [ ] Snapshots never contain sensitive data (passwords, credit cards, SSNs)
- [ ] Mock external services — never call production APIs
- [ ] Environment variables for secrets; never embedded in test code
- [ ] No real database operations in unit tests — use mocks or in-memory DB

## Anti-Patterns (5 Wrong/Correct)

| Anti-Pattern | Wrong | Correct |
|---|---|---|
| **Snapshot Abuse** | Snapshot 500-line JSON response (brittle) | Snapshot only critical shape; assert values separately |
| **No Describe Blocks** | 50 flat tests in one file | Organize with `describe()` for related tests |
| **Testing Framework Internals** | Test Vitest internals (timeout logic) | Test application code only |
| **Async Leaks** | `test('async', async () => { fetch(...); })` missing await | Always `await` async operations; Vitest catches unhandled rejections |
| **No Coverage Tracking** | No coverage config; coverage unknown | Set thresholds in vitest.config.ts; enforce in CI |

## Output Template

When creating Vitest test suites, provide:
1. Test files organized by feature with `describe()` blocks
2. Setup/teardown code (beforeEach, afterEach)
3. Mocking strategy for external dependencies
4. Coverage configuration with thresholds
5. CI/CD integration commands
