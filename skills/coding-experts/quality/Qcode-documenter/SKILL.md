---
name: Qcode-documenter
description: Generates, formats, and validates technical documentation — including docstrings, OpenAPI/Swagger specs, JSDoc annotations, doc portals, and user guides. Use when adding docstrings to functions or classes, creating API documentation, building documentation sites, or writing tutorials and user guides. Invoke for OpenAPI/Swagger specs, JSDoc, doc portals, getting started guides.
license: MIT
metadata: 
author: "https://github.com/Jeffallan"
version: 1.1.0
domain: quality
triggers: documentation, docstrings, OpenAPI, Swagger, JSDoc, comments, API docs, tutorials, user guides, doc site
role: specialist
scope: implementation
output-format: code
related-skills: spec-miner, fullstack-guardian, code-reviewer
invocation_trigger: When specialized language or framework best practices are needed.
recommendedModel: haiku
---

# Code Documenter

Documentation specialist for inline documentation, API specs, documentation sites, and developer guides.

## When to Use This Skill

Applies to any task involving code documentation, API specs, or developer-facing guides. See the reference table below for specific sub-topics.

## Core Workflow

1. **Discover** - Ask for format preference and exclusions
2. **Detect** - Identify language and framework
3. **Analyze** - Find undocumented code
4. **Document** - Apply consistent format
5. **Validate** - Test all code examples compile/run:
   - Python: `python -m doctest file.py` for doctest blocks; `pytest --doctest-modules` for module-wide checks
   - TypeScript/JavaScript: `tsc --noEmit` to confirm typed examples compile
   - OpenAPI: validate spec with `npx @redocly/cli lint openapi.yaml`
   - If validation fails: fix examples and re-validate before proceeding to the Report step
6. **Report** - Generate coverage summary

## Reference Guide

Load detailed guidance based on context:

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Python Docstrings | `references/python-docstrings.md` | Google, NumPy, Sphinx styles |
| TypeScript JSDoc | `references/typescript-jsdoc.md` | JSDoc patterns, TypeScript |
| FastAPI/Django API | `references/api-docs-fastapi-django.md` | Python API documentation |
| NestJS/Express API | `references/api-docs-nestjs-express.md` | Node.js API documentation |
| Coverage Reports | `references/coverage-reports.md` | Generating documentation reports |
| Documentation Systems | `references/documentation-systems.md` | Doc sites, static generators, search, testing |
| Interactive API Docs | `references/interactive-api-docs.md` | OpenAPI 3.1, portals, GraphQL, WebSocket, gRPC, SDKs |
| User Guides & Tutorials | `references/user-guides-tutorials.md` | Getting started, tutorials, troubleshooting, FAQs |

## Constraints

### MUST DO
- Ask for format preference before starting
- Detect framework for correct API doc strategy
- Document all public functions/classes
- Include parameter types and descriptions
- Document exceptions/errors
- Test code examples in documentation
- Generate coverage report

### MUST NOT DO
- Assume docstring format without asking
- Apply wrong API doc strategy for framework
- Write inaccurate or untested documentation
- Skip error documentation
- Document obvious getters/setters verbosely
- Create documentation that's hard to maintain

## Output Formats

Depending on the task, provide:
1. **Code Documentation:** Documented files + coverage report
2. **API Docs:** OpenAPI specs + portal configuration
3. **Doc Sites:** Site configuration + content structure + build instructions
4. **Guides/Tutorials:** Structured markdown with examples + diagrams

## Code Patterns (3 Examples)

### Pattern 1: Complete TypeScript/JSDoc with Types and Examples
```typescript
/**
 * Fetches user profile with optional caching strategy.
 *
 * @param {string} userId - Unique user identifier (e.g., "usr_123abc")
 * @param {Object} [options] - Configuration object
 * @param {boolean} [options.cached=true] - Use cache if available
 * @param {number} [options.ttl=3600] - Cache time-to-live in seconds
 * 
 * @returns {Promise<UserProfile>} User profile with normalized fields
 * @throws {NotFoundError} If user does not exist (404)
 * @throws {UnauthorizedError} If token is invalid (401)
 *
 * @example
 * // Simple usage
 * const profile = await getUser('usr_123');
 *
 * @example
 * // Bypass cache and set TTL
 * const profile = await getUser('usr_123', { cached: false, ttl: 7200 });
 */
async function getUser(userId: string, options?: GetUserOptions): Promise<UserProfile> { }
```

### Pattern 2: Python Google-Style with Raises
```python
def process_payment(order_id: str, amount: float) -> PaymentResult:
    """Process a payment for the given order.

    Validates the order, deducts funds, and updates inventory atomically.

    Args:
        order_id: Unique order identifier (UUID format required).
        amount: Payment amount in USD. Must be positive and match order total.

    Returns:
        PaymentResult with status, transaction_id, and timestamp.

    Raises:
        ValueError: If amount is negative or order_id format is invalid.
        OrderNotFoundError: If no matching order exists in database.
        InsufficientFundsError: If customer account balance is insufficient.
        PaymentGatewayError: If payment processor is unavailable.

    Example:
        >>> result = process_payment('550e8400-e29b-41d4-a716-446655440000', 99.99)
        >>> print(result.status)
        'completed'
    """
```

### Pattern 3: OpenAPI 3.1 Endpoint Schema
```yaml
/api/v1/users/{userId}:
  get:
    summary: Retrieve a user by ID
    description: |
      Fetches a single user profile. Requires valid JWT token.
      Returns 404 if user does not exist.
    parameters:
      - name: userId
        in: path
        required: true
        schema:
          type: string
          pattern: '^usr_[a-z0-9]{20}$'
        description: Unique user identifier
    responses:
      '200':
        description: User found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserProfile'
      '404':
        description: User not found
      '401':
        description: Unauthorized (invalid token)
    security:
      - BearerAuth: []
```

## Comment Template

Documentation headers for modules should include scope and examples:

```typescript
/**
 * Authentication and authorization service.
 *
 * Handles JWT token validation, role-based access control (RBAC),
 * and session management.
 *
 * Usage:
 *   import { AuthService } from './auth';
 *   const auth = new AuthService(config);
 *   const isValid = await auth.validateToken(token);
 *
 * Security: Never log tokens or passwords. Use environment variables
 * for secrets (DATABASE_URL, JWT_SECRET, etc.).
 */
```

## Lint Rules

Enforce documentation standards with automated tools:

```bash
# Validate JSDoc completeness
npm install --save-dev eslint-plugin-jsdoc
npx eslint --plugin jsdoc src/ --rule "jsdoc/require-jsdoc: error"

# Validate markdown documentation
npm install --save-dev markdownlint
npx markdownlint "docs/**/*.md"

# Python docstring validation
pip install pydocstyle
pydocstyle src/ --convention=google

# OpenAPI spec validation
npm install --save-dev @redocly/cli
npx redocly lint openapi.yaml
```

## Security Checklist (5+)

- [ ] No hardcoded API keys, passwords, or tokens in examples
- [ ] Examples use fake/test credentials (e.g., `test_token_xxx`, `user@example.com`)
- [ ] Documentation doesn't expose internal system architecture or debugging info
- [ ] API examples include security requirements (authentication, rate limits)
- [ ] Secrets referenced via environment variables in all code examples

## Anti-Patterns (5 Wrong/Correct)

| Anti-Pattern | Wrong | Correct |
|---|---|---|
| **Outdated Docs** | "Use the v2 API" (but v3 shipped 6 months ago) | Bump docs version with code; add migration guides |
| **No Examples** | Function description only, no usage | Every public function/endpoint includes runnable example |
| **Jargon-Heavy** | "Hydrate the denormalized cache layer" | "Fetch and cache the user profile" |
| **Copy from Code Comments** | Docstring repeats inline comments verbatim | Docstring explains "why" and "how to use"; inline comments explain "what" |
| **No Versioning** | Single README for 5 major versions | Maintain separate docs per version; use version switcher |

## Knowledge Reference

Google/NumPy/Sphinx docstrings, JSDoc, OpenAPI 3.0/3.1, AsyncAPI, gRPC/protobuf, FastAPI, Django, NestJS, Express, GraphQL, Docusaurus, MkDocs, VitePress, Swagger UI, Redoc, Stoplight
