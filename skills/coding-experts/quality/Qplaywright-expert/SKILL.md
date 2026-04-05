---
name: Qplaywright-expert
description: "Use when writing E2E tests with Playwright, setting up test infrastructure, or debugging flaky browser tests. Invoke to write test scripts, create page objects, configure test fixtures, set up reporters, add CI integration, implement API mocking, or perform visual regression testing. Trigger terms: Playwright, E2E test, end-to-end, browser testing, automation, UI testing, visual testing, Page Object Model, test flakiness."
license: MIT
metadata: 
author: "https://github.com/Jeffallan"
version: 1.1.0
domain: quality
triggers: Playwright, E2E test, end-to-end, browser testing, automation, UI testing, visual testing
role: specialist
scope: testing
output-format: code
related-skills: test-master, react-expert, devops-engineer
invocation_trigger: When specialized language or framework best practices are needed.
recommendedModel: haiku
---

# Playwright Expert

E2E testing specialist with deep expertise in Playwright for robust, maintainable browser automation.

## Core Workflow

1. **Analyze requirements** - Identify user flows to test
2. **Setup** - Configure Playwright with proper settings
3. **Write tests** - Use POM pattern, proper selectors, auto-waiting
4. **Debug** - Run test → check trace → identify issue → fix → verify fix
5. **Integrate** - Add to CI/CD pipeline

## Reference Guide

Load detailed guidance based on context:

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Selectors | `references/selectors-locators.md` | Writing selectors, locator priority |
| Page Objects | `references/page-object-model.md` | POM patterns, fixtures |
| API Mocking | `references/api-mocking.md` | Route interception, mocking |
| Configuration | `references/configuration.md` | playwright.config.ts setup |
| Debugging | `references/debugging-flaky.md` | Flaky tests, trace viewer |

## Constraints

### MUST DO
- Use role-based selectors when possible
- Leverage auto-waiting (don't add arbitrary timeouts)
- Keep tests independent (no shared state)
- Use Page Object Model for maintainability
- Enable traces/screenshots for debugging
- Run tests in parallel

### MUST NOT DO
- Use `waitForTimeout()` (use proper waits)
- Rely on CSS class selectors (brittle)
- Share state between tests
- Ignore flaky tests
- Use `first()`, `nth()` without good reason

## Code Patterns (3 Examples)

### Pattern 1: Secure Authentication Test with API Mocking
```typescript
test('login flow with CSRF token validation', async ({ page }) => {
  // Mock the auth endpoint to avoid real credentials
  await page.route('**/api/login', async (route) => {
    const request = route.request();
    const postData = JSON.parse(request.postData() || '{}');
    
    // Verify CSRF token is sent
    const csrfToken = await page.evaluate(() => 
      document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    );
    expect(csrfToken).toBeTruthy();
    
    route.abort(); // Prevent real login
  });
  
  await page.goto('/login');
  await page.getByLabel('Username').fill('testuser@example.com');
  await page.getByLabel('Password').fill('test_password_123'); // Non-real password
  await page.getByRole('button', { name: 'Sign In' }).click();
});
```

### Pattern 2: Page Object with JSDoc
```typescript
/**
 * Represents the checkout page with methods for payment and shipping.
 * 
 * @example
 * const checkout = new CheckoutPage(page);
 * await checkout.fillShippingAddress('123 Main St');
 * await checkout.selectPaymentMethod('credit-card');
 * await checkout.submitOrder();
 */
export class CheckoutPage {
  readonly page: Page;
  readonly shippingAddressInput: Locator;
  readonly paymentMethodSelect: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shippingAddressInput = page.getByLabel('Shipping Address');
    this.paymentMethodSelect = page.getByRole('combobox', { name: 'Payment Method' });
    this.submitButton = page.getByRole('button', { name: 'Place Order' });
  }

  async fillShippingAddress(address: string) {
    await this.shippingAddressInput.fill(address);
  }

  async selectPaymentMethod(method: 'credit-card' | 'paypal') {
    await this.paymentMethodSelect.selectOption(method);
  }

  async submitOrder() {
    await this.submitButton.click();
    await this.page.waitForURL('/order/success');
  }
}
```

### Pattern 3: Reliable Wait Patterns (Not Sleep)
```typescript
test('waits for dynamic content reliably', async ({ page }) => {
  // ✅ Wait for network response
  const responsePromise = page.waitForResponse('**/api/search');
  await page.getByPlaceholder('Search').fill('laptop');
  const response = await responsePromise;
  expect(response.status()).toBe(200);

  // ✅ Wait for element visibility
  const results = page.getByRole('listitem', { name: /laptop/i });
  await results.first().waitFor({ state: 'visible', timeout: 5000 });

  // ✅ Wait for JavaScript condition
  await page.waitForFunction(() => 
    document.querySelectorAll('[data-testid="search-result"]').length > 0
  );
});
```

## Comment Template

E2E test files should include user journey documentation:

```typescript
/**
 * End-to-end tests for user registration and login flows.
 *
 * User Journey:
 * 1. Visitor lands on signup page
 * 2. Enters email, password, and accepts terms
 * 3. Receives verification email (mocked)
 * 4. Clicks verification link and confirms account
 * 5. Redirects to login page; user signs in
 * 6. Dashboard loads; account created successfully
 *
 * Security Tested:
 * - CSRF token validation on signup form
 * - Password strength requirements enforced
 * - Session tokens do not leak in URLs
 * - Verification email sent only once
 */
```

## Lint Rules

Configure Playwright linting and best practices:

```bash
# ESLint with Playwright rules
npm install --save-dev eslint-plugin-playwright
npx eslint "tests/**/*.spec.ts" --plugin playwright

# Type checking for Playwright
npx tsc --noEmit

# Run tests with strict assertion timeout
npx playwright test --timeout=30000

# Enforce parallel execution and sharding
npx playwright test --workers=4
```

## Security Checklist (5+)

- [ ] No hardcoded passwords/API keys in test files; use environment variables
- [ ] API mocking enabled to prevent real payment/auth requests
- [ ] CSRF tokens validated in form-based tests
- [ ] Authentication flows tested with fake/test credentials (test@example.com)
- [ ] SSL certificate warnings suppressed for test environments only
- [ ] Sensitive data (credit cards, SSNs) never logged or captured in screenshots
- [ ] Page objects abstract selectors to prevent brittle hardcoded locators

## Anti-Patterns (5 Wrong/Correct)

| Anti-Pattern | Wrong | Correct |
|---|---|---|
| **Hardcoded Selectors** | `page.locator('.btn.btn-primary.login-button')` (breaks on refactor) | `page.getByRole('button', { name: 'Sign In' })` (resilient) |
| **Sleep Instead of waitFor** | `await page.waitForTimeout(3000); ...` (flaky) | `await page.getByText('Loaded').waitFor()` (reliable) |
| **No Page Objects** | Test files contain raw selectors and actions | Extract to LoginPage, CheckoutPage, etc. classes |
| **Testing UI, Not Behavior** | Test that button color is blue | Test that clicking button submits the form correctly |
| **Flaky Network Tests** | Tests fail randomly due to network latency | Mock APIs; use `route()` to control responses |

## Knowledge Reference

Playwright, Page Object Model, auto-waiting, locators, fixtures, API mocking, trace viewer, visual comparisons, parallel execution, CI/CD integration
