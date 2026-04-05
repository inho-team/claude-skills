---
name: Qtest-master
description: Generates test files, creates mocking strategies, analyzes code coverage, designs test architectures, and produces test plans and defect reports across functional, performance, and security testing disciplines. Use when writing unit tests, integration tests, or E2E tests; creating test strategies or automation frameworks; analyzing coverage gaps; performance testing with k6 or Artillery; security testing with OWASP methods; debugging flaky tests; or working on QA, regression, test automation, quality gates, shift-left testing, or test maintenance.
license: MIT
metadata: 
author: "https://github.com/Jeffallan"
version: 1.1.0
domain: quality
triggers: test, testing, QA, unit test, integration test, E2E, coverage, performance test, security test, regression, test strategy, test automation, test framework, quality metrics, defect, exploratory, usability, accessibility, localization, manual testing, shift-left, quality gate, flaky test, test maintenance
role: specialist
scope: testing
output-format: report
related-skills: fullstack-guardian, playwright-expert, devops-engineer
invocation_trigger: When specialized language or framework best practices are needed.
recommendedModel: haiku
---

# Test Master

Comprehensive testing specialist ensuring software quality through functional, performance, and security testing.

## Core Workflow

1. **Define scope** — Identify what to test and which testing types apply
2. **Create strategy** — Plan the test approach across functional, performance, and security perspectives
3. **Write tests** — Implement tests with proper assertions (see example below)
4. **Execute** — Run tests and collect results
   - If tests fail: classify the failure (assertion error vs. environment/flakiness), fix root cause, re-run
   - If tests are flaky: isolate ordering dependencies, check async handling, add retry or stabilization logic
5. **Report** — Document findings with severity ratings and actionable fix recommendations
   - Verify coverage targets are met before closing; flag gaps explicitly

## Quick-Start Example

A minimal Jest unit test illustrating the key patterns this skill enforces:

```js
// ✅ Good: meaningful description, specific assertion, isolated dependency
describe('calculateDiscount', () => {
  it('applies 10% discount for premium users', () => {
    const result = calculateDiscount({ price: 100, userTier: 'premium' });
    expect(result).toBe(90); // specific outcome, not just truthy
  });

  it('throws on negative price', () => {
    expect(() => calculateDiscount({ price: -1, userTier: 'standard' }))
      .toThrow('Price must be non-negative');
  });
});
```

Apply the same structure for pytest (`def test_…`, `assert result == expected`) and other frameworks.

## Reference Guide

Load detailed guidance based on context:

<!-- TDD Iron Laws and Testing Anti-Patterns adapted from obra/superpowers by Jesse Vincent (@obra), MIT License -->

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Unit Testing | `references/unit-testing.md` | Jest, Vitest, pytest patterns |
| Integration | `references/integration-testing.md` | API testing, Supertest |
| E2E | `references/e2e-testing.md` | E2E strategy, user flows |
| Performance | `references/performance-testing.md` | k6, load testing |
| Security | `references/security-testing.md` | Security test checklist |
| Reports | `references/test-reports.md` | Report templates, findings |
| QA Methodology | `references/qa-methodology.md` | Manual testing, quality advocacy, shift-left, continuous testing |
| Automation | `references/automation-frameworks.md` | Framework patterns, scaling, maintenance, team enablement |
| TDD Iron Laws | `references/tdd-iron-laws.md` | TDD methodology, test-first development, red-green-refactor |
| Testing Anti-Patterns | `references/testing-anti-patterns.md` | Test review, mock issues, test quality problems |

## Constraints

**MUST DO**
- Test happy paths AND error/edge cases (e.g., empty input, null, boundary values)
- Mock external dependencies — never call real APIs or databases in unit tests
- Use meaningful `it('…')` descriptions that read as plain-English specifications
- Assert specific outcomes (`expect(result).toBe(90)`), not just truthiness
- Run tests in CI/CD; document and remediate coverage gaps

**MUST NOT**
- Skip error-path testing (e.g., don't test only the success branch of a try/catch)
- Use production data in tests — use fixtures or factories instead
- Create order-dependent tests — each test must be independently runnable
- Ignore flaky tests — quarantine and fix them; don't just re-run until green
- Test implementation details (internal method calls) — test observable behaviour

## Code Patterns (3 Examples)

### Pattern 1: Arrange-Act-Assert (AAA) Structure
```js
// ✅ Clear, readable test with separated phases
describe('PaymentProcessor', () => {
  it('calculates total with tax correctly', () => {
    // Arrange
    const processor = new PaymentProcessor({ taxRate: 0.1 });
    const items = [{ price: 100 }, { price: 50 }];
    
    // Act
    const total = processor.calculate(items);
    
    // Assert
    expect(total).toBe(165); // 150 + 15% tax
  });
});
```

### Pattern 2: Async Error Handling
```js
// ✅ Proper async/await with error assertions
describe('UserService', () => {
  it('rejects with 404 when user does not exist', async () => {
    const service = new UserService();
    await expect(service.fetchUser(999)).rejects.toThrow('User not found');
  });
});
```

### Pattern 3: Fixture-Based Setup (Reduces Duplication)
```js
// ✅ Reusable test data and setup
const userFixture = { id: 1, name: 'Alice', role: 'admin' };
describe('AuthService', () => {
  it('grants access for admin users', () => {
    expect(canAccess(userFixture, 'DELETE_USERS')).toBe(true);
  });
});
```

## Comment Template

Every test file should include JSDoc header documenting test scope:

```js
/**
 * Unit tests for UserService authentication methods.
 *
 * Coverage:
 * - login() with valid/invalid credentials
 * - logout() session cleanup
 * - refreshToken() expiration handling
 *
 * Security: Tests verify password hashing, no plaintext storage.
 * Performance: All mocked — no real API calls.
 */
```

## Lint Rules

Run the following in CI:

```bash
# Jest config
jest --coverage --collectCoverageFrom="src/**/*.js" --coveragePathIgnorePatterns="node_modules"

# ESLint + jest plugin
eslint "**/*.test.js" --ext .js --plugin jest

# Coverage thresholds in jest.config.js
coverageThreshold: {
  global: { branches: 80, functions: 80, lines: 80, statements: 80 }
}
```

## Security Checklist (5+)

- [ ] No test data includes real passwords, API keys, or tokens
- [ ] Fixtures use redacted or synthetic credentials (e.g., `test@example.com`)
- [ ] Mock external services — never call production APIs
- [ ] XSS/SQL injection tests included for security-sensitive functions
- [ ] Secrets not logged in test output — check `console.log()` statements

## Anti-Patterns (5 Wrong/Correct)

| Anti-Pattern | Wrong | Correct |
|---|---|---|
| **Test Implementation, Not Behavior** | `expect(getUserCalls).toBe(1)` (mocking internals) | `expect(result).toBe(expectedUser)` (assert outcome) |
| **Flaky Tests** | `await wait(500); expect(...)` (arbitrary sleep) | `await screen.findByText('Loaded')` (wait for state) |
| **No Assertions** | `test('user exists', () => { getUser(1); })` | `test('user exists', () => { expect(getUser(1)).toBeDefined(); })` |
| **Testing Private Methods** | `expect(obj._privateMethod()).toBe(...)` | Only test public interface; internal changes shouldn't break tests |
| **Copy-Paste Tests** | Identical describe blocks with 1 value changed | Use parametrized tests: `describe.each(testCases)(...)`|

## Output Templates

When creating test plans, provide:
1. Test scope and approach
2. Test cases with expected outcomes
3. Coverage analysis
4. Findings with severity (Critical/High/Medium/Low)
5. Specific fix recommendations
