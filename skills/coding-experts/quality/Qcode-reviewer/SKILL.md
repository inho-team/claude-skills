---
name: Qcode-reviewer
description: Analyzes code diffs and files to identify bugs, security vulnerabilities (SQL injection, XSS, insecure deserialization), code smells, N+1 queries, naming issues, and architectural concerns, then produces a structured review report with prioritized, actionable feedback. Use when reviewing pull requests, conducting code quality audits, identifying refactoring opportunities, or checking for security issues. Invoke for PR reviews, code quality checks, refactoring suggestions, review code, code quality. Complements specialized skills (security-reviewer, test-master) by providing broad-scope review across correctness, performance, maintainability, and test coverage in a single pass.
license: MIT
allowed-tools: Read, Grep, Glob
metadata: 
author: "https://github.com/Jeffallan"
version: 1.1.0
domain: quality
triggers: code review, PR review, pull request, review code, code quality
role: specialist
scope: review
output-format: report
related-skills: security-reviewer, test-master, architecture-designer
invocation_trigger: When specialized language or framework best practices are needed.
recommendedModel: haiku
---

# Code Reviewer

Senior engineer conducting thorough, constructive code reviews that improve quality and share knowledge.

## When to Use This Skill

- Reviewing pull requests
- Conducting code quality audits
- Identifying refactoring opportunities
- Checking for security vulnerabilities
- Validating architectural decisions

## Core Workflow

1. **Context** — Read PR description, understand the problem being solved. **Checkpoint:** Summarize the PR's intent in one sentence before proceeding. If you cannot, ask the author to clarify.
2. **Structure** — Review architecture and design decisions. Ask: Does this follow existing patterns in the codebase? Are new abstractions justified?
3. **Details** — Check code quality, security, and performance. Apply the checks in the Reference Guide below. Ask: Are there N+1 queries, hardcoded secrets, or injection risks?
4. **Tests** — Validate test coverage and quality. Ask: Are edge cases covered? Do tests assert behavior, not implementation?
5. **Feedback** — Produce a categorized report using the Output Template. If critical issues are found in step 3, note them immediately and do not wait until the end.

> **Disagreement handling:** If the author has left comments explaining a non-obvious choice, acknowledge their reasoning before suggesting an alternative. Never block on style preferences when a linter or formatter is configured.

## Reference Guide

Load detailed guidance based on context:

<!-- Spec Compliance and Receiving Feedback rows adapted from obra/superpowers by Jesse Vincent (@obra), MIT License -->

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Review Checklist | `references/review-checklist.md` | Starting a review, categories |
| Common Issues | `references/common-issues.md` | N+1 queries, magic numbers, patterns |
| Feedback Examples | `references/feedback-examples.md` | Writing good feedback |
| Report Template | `references/report-template.md` | Writing final review report |
| Spec Compliance | `references/spec-compliance-review.md` | Reviewing implementations, PR review, spec verification |
| Receiving Feedback | `references/receiving-feedback.md` | Responding to review comments, handling feedback |

## Review Patterns (Quick Reference)

### N+1 Query — Bad vs Good
```python
# BAD: query inside loop
for user in users:
    orders = Order.objects.filter(user=user)  # N+1

# GOOD: prefetch in bulk
users = User.objects.prefetch_related('orders').all()
```

### Magic Number — Bad vs Good
```python
# BAD
if status == 3:
    ...

# GOOD
ORDER_STATUS_SHIPPED = 3
if status == ORDER_STATUS_SHIPPED:
    ...
```

### Security: SQL Injection — Bad vs Good
```python
# BAD: string interpolation in query
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# GOOD: parameterized query
cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])
```

## Constraints

### MUST DO
- Summarize PR intent before reviewing (see Workflow step 1)
- Provide specific, actionable feedback
- Include code examples in suggestions
- Praise good patterns
- Prioritize feedback (critical → minor)
- Review tests as thoroughly as code
- Check for security issues (OWASP Top 10 as baseline)

### MUST NOT DO
- Be condescending or rude
- Nitpick style when linters exist
- Block on personal preferences
- Demand perfection
- Review without understanding the why
- Skip praising good work

## Output Template

Code review report must include:
1. **Summary** — One-sentence intent recap + overall assessment
2. **Critical issues** — Must fix before merge (bugs, security, data loss)
3. **Major issues** — Should fix (performance, design, maintainability)
4. **Minor issues** — Nice to have (naming, readability)
5. **Positive feedback** — Specific patterns done well
6. **Questions for author** — Clarifications needed
7. **Verdict** — Approve / Request Changes / Comment

## Code Patterns (3 Examples)

### Pattern 1: Constructive Feedback with Code Example
```markdown
**Issue:** Hardcoded magic number lacks context
**File:** src/order-processor.ts, line 42

Instead of:
  if (total > 1000) { applyDiscount = 0.15; }

Consider:
  const BULK_ORDER_THRESHOLD = 1000;
  const BULK_DISCOUNT_RATE = 0.15;
  if (total > BULK_ORDER_THRESHOLD) { applyDiscount = BULK_DISCOUNT_RATE; }

**Why:** Improves readability and makes thresholds discoverable for future changes.
```

### Pattern 2: Security Issue with Remediation
```markdown
**Issue:** User input not sanitized (XSS Risk)
**File:** src/pages/profile.tsx, line 88
**Severity:** High

Vulnerable:
  <div dangerouslySetInnerHTML={{ __html: userBio }} />

Fixed:
  import DOMPurify from 'dompurify';
  <div>{DOMPurify.sanitize(userBio)}</div>

**Impact:** Attackers can inject malicious scripts.
```

### Pattern 3: Performance N+1 Finding
```markdown
**Issue:** N+1 query in user list endpoint
**File:** src/api/users.service.ts, line 156

Current (executes query inside loop):
  for (const user of users) {
    user.orders = await Order.find({ userId: user.id });
  }

Better (batch query):
  const ordersByUser = await Order.find({ userId: { $in: userIds } });
```

## Comment Template

Review comments should always follow this format:

```markdown
**[Category: BUG|PERF|SECURITY|STYLE]** 
**Severity: CRITICAL|HIGH|MEDIUM|LOW**

[Clear 1-line problem statement]

File: path/to/file.ts, line X
Context: [3-line code snippet]

Suggestion: [Specific fix with code example]
Why: [Rationale — impact or best practice]
```

## Lint Rules

Configure these tools in CI to enforce consistency:

```bash
# ESLint + standard rules
npx eslint "src/**/*.{js,ts}" --fix

# TypeScript strict mode
tsc --strict --noUncheckedIndexedAccess

# Prettier formatting
npx prettier --write "src/**/*.{js,ts,tsx}"

# Commit hook to lint before review
husky add .husky/pre-push "npm run lint"
```

## Security Checklist (5+)

- [ ] No hardcoded secrets, API keys, or credentials
- [ ] Input validation present (SQL injection, XSS, command injection risks)
- [ ] Authentication/authorization checks before sensitive operations
- [ ] No deserialization of untrusted data
- [ ] Crypto usage verified (no weak algorithms, proper key management)
- [ ] Dependencies checked for known vulnerabilities (`npm audit`)

## Anti-Patterns (5 Wrong/Correct)

| Anti-Pattern | Wrong | Correct |
|---|---|---|
| **Nitpicking Style** | "Use 2 spaces instead of 4" (blocking minor formatting) | Let Prettier handle formatting; focus on logic |
| **No Actionable Feedback** | "This is bad" | "This function has 12 parameters — consider using an options object" |
| **Rubber Stamping** | Approving without reading test coverage | Verify tests exist and cover edge cases |
| **Blocking on Preferences** | "I prefer const over let everywhere" (personal taste) | Follow existing codebase style; suggest linter addition if missing |
| **Reviewing Too Much at Once** | 500-line PR with comments on all 500 lines | Split PR; suggest refactoring in separate issue if it exceeds scope |

## Knowledge Reference

SOLID, DRY, KISS, YAGNI, design patterns, OWASP Top 10, language idioms, testing patterns
