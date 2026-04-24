> Adapted from oh-my-claudecode (MIT, © 2025 Yeachan Heo) — https://github.com/Yeachan-Heo/oh-my-claudecode/blob/main/agents/critic.md

# Nine-Step Critical Review Protocol

This document defines the full specification for each of the 9 steps in the Qcritical-review protocol.
Not every SIVS stage runs all 9 steps — see the stage mapping in `../SKILL.md`.

---

## Step 1 — Pre-commitment Prediction

**Name:** Pre-commitment Prediction

**Trigger condition:** Fires at the very start of any review session, before the artifact is read in detail.

**Output schema:**
```markdown
### Pre-commitment Predictions
- Predicted issue 1: [domain] — [rationale]
- Predicted issue 2: [domain] — [rationale]
- Predicted issue 3: [domain] — [rationale]
(3–5 predictions minimum)
```

**What it does:** Before reading the artifact carefully, the reviewer commits in writing to 3–5 probable problem areas based on artifact type, domain, and known failure patterns. This prevents post-hoc rationalization and anchors the investigation.

**Concrete example:**
> Artifact: authentication spec for a web API.
> Predictions:
> - Session invalidation on logout is likely underspecified.
> - Token refresh edge cases (expiry during in-flight request) probably not covered.
> - Concurrent login from multiple devices may be ambiguous.
> - Rate-limiting on login endpoint not mentioned.

---

## Step 2 — Multi-perspective Review

**Name:** Multi-perspective Review (SE / Junior / Ops)

**Trigger condition:** Fires after initial artifact reading is complete. Applies to both code and plan artifacts. Three professional lenses are applied in parallel.

**Output schema:**
```markdown
### Multi-perspective Review

#### SE (Senior Engineer) Perspective
- [Finding]: [Evidence]

#### Junior Developer Perspective
- [Finding]: [Evidence]

#### Ops / SRE Perspective
- [Finding]: [Evidence]
```

**What it does:** Forces examination of the artifact through at least three distinct professional viewpoints:
- **SE**: Scalability, maintainability, architecture correctness, failure blast radius.
- **Junior**: Clarity, onboarding friction, implicit knowledge requirements, ambiguous steps.
- **Ops**: Operational concerns — deployment, monitoring, rollback, incident surface.

**Concrete example:**
> Artifact: database migration script.
> - SE: No index created before the backfill; full-table scan will lock rows.
> - Junior: No comment explaining why the column default is NULL during migration window.
> - Ops: No rollback script provided; if migration fails halfway, recovery is manual.

---

## Step 3 — Pre-Mortem

**Name:** Pre-Mortem (5–7 failure scenarios)

**Trigger condition:** Fires during plan/spec review (spec stage). Assumes the plan has been executed exactly as written and asks: "What went wrong?"

**Output schema:**
```markdown
### Pre-Mortem Scenarios
| # | Scenario | Probability | Addressed in Plan? |
|---|----------|-------------|-------------------|
| 1 | [failure description] | HIGH/MED/LOW | YES / NO / PARTIAL |
...
(5–7 scenarios)
```

**What it does:** Generates 5–7 concrete failure scenarios by mentally simulating exact execution of the plan. Each scenario is checked against the artifact to determine whether it is handled, partially handled, or silently ignored.

**Concrete example:**
> Plan: deploy new payment service.
> Scenarios:
> 1. Third-party payment gateway is down during rollout — not addressed.
> 2. Database migration takes longer than maintenance window — partially addressed (timeout mentioned, no fallback).
> 3. Feature flag not toggled off after incident — not addressed.
> 4. Rollback fails because DB schema change is not reversible — not addressed.
> 5. Load spike hits new service before autoscaling kicks in — addressed (pre-warm noted).

---

## Step 4 — Ambiguity Scan

**Name:** Ambiguity Scan

**Trigger condition:** Fires during spec/plan review. Applied to each discrete step or requirement in the artifact.

**Output schema:**
```markdown
### Ambiguity Scan
| Item | Interpretation A | Interpretation B | Risk if Wrong |
|------|-----------------|-----------------|---------------|
| [step/req] | [reading 1] | [reading 2] | HIGH/MED/LOW |
```

**What it does:** For each step or requirement, determines whether two competent developers reading independently could arrive at different, valid interpretations. Documents both interpretations and the consequence of choosing wrong.

**Concrete example:**
> Spec: "The API should return user data after login."
> - Interpretation A: Return full user profile including roles and preferences.
> - Interpretation B: Return only the authentication token and user ID.
> - Risk if wrong: HIGH — security surface and payload size differ significantly.

---

## Step 5 — Devil's Advocate

**Name:** Devil's Advocate

**Trigger condition:** Fires during implementation/verify review. The reviewer adopts an adversarial stance: the implementation is assumed guilty until proven innocent.

**Output schema:**
```markdown
### Devil's Advocate
**Claim:** [What the implementation appears to do]
**Challenge:** [Why it might be wrong or insufficient]
**Evidence:** [File:line or specific artifact reference]
**Severity:** CRITICAL / HIGH / MEDIUM / LOW
```

**What it does:** Argues that the implementation is incorrect, incomplete, or unsafe. Actively searches for inputs that crash the system, missing error paths, race conditions, and silent failures. Does not look for confirmation — looks for refutation.

**Concrete example:**
> Implementation: `calculateAverage(items)` returns `total / items.length`.
> Challenge: When `items` is an empty array, this produces `NaN` (division by zero equivalent).
> Evidence: `utils.js:42` — no guard on `items.length === 0`.
> Severity: HIGH — callers do not check for `NaN` before rendering.

---

## Step 6 — Self-audit

**Name:** Self-audit

**Trigger condition:** Fires after all CRITICAL and MAJOR findings have been drafted (post Devil's Advocate and Multi-perspective). Before findings are presented.

**Output schema:**
```markdown
### Self-audit
| Finding | Confidence | Author Could Refute? | Classification |
|---------|-----------|---------------------|----------------|
| [finding summary] | HIGH/MED/LOW | YES / NO | FLAW / PREFERENCE / OPEN QUESTION |
```

**What it does:** Re-examines each CRITICAL/MAJOR finding and asks:
1. How confident am I in this finding?
2. Could a reasonable author refute this with context I may lack?
3. Is this a genuine flaw, or a style/preference disagreement?

Low-confidence or author-refutable findings are downgraded to "Open Questions" rather than presented as definitive flaws.

**Concrete example:**
> Finding: "The component re-renders on every keystroke — performance issue."
> Self-audit: Author could reasonably refute (component is simple, debounce added at consumer layer).
> Classification: OPEN QUESTION — move to discussion rather than blocker.

---

## Step 7 — Realist Check

**Name:** Realist Check

**Trigger condition:** Fires after Self-audit completes. Applied to all remaining CRITICAL/MAJOR findings.

**Output schema:**
```markdown
### Realist Check
| Finding | Realistic Worst Case | Mitigating Factors | Detection Speed | Recalibrated Severity |
|---------|--------------------|--------------------|-----------------|----------------------|
| [finding] | [actual worst case] | [what reduces impact] | FAST/MED/SLOW | CRITICAL/HIGH/MED/LOW |
```

**What it does:** Pressure-tests severity ratings by evaluating:
- What is the realistic (not theoretical) worst-case outcome?
- What mitigating factors already exist?
- How quickly would the issue be detected in production?

Rules: Data loss, security breaches, and financial impact always retain their severity. Other findings are evaluated contextually and may be downgraded.

**Concrete example:**
> Finding: "Missing input validation on username field."
> Realistic worst case: SQL injection if backend ORM is bypassed.
> Mitigating factors: ORM with parameterized queries is used throughout.
> Detection speed: FAST (integration tests would catch raw SQL).
> Recalibrated severity: HIGH → MEDIUM (ORM mitigates, but defense-in-depth still missing).

---

## Step 8 — Adversarial Escalation

**Name:** Adversarial Escalation

**Trigger condition:** Fires automatically if ANY of the following conditions are met after prior steps: (a) any CRITICAL finding remains, (b) 3 or more MAJOR findings remain, (c) a systemic pattern is identified across findings.

**Output schema:**
```markdown
### Adversarial Escalation [TRIGGERED]

**Trigger reason:** [CRITICAL finding / 3+ MAJOR / Systemic pattern]

**Expanded scope:**
- [Additional area investigated beyond original scope]

**Additional findings:**
- [Finding] — [Severity] — [Evidence]

**Standard:** Guilty until proven innocent. Every claim requires evidence.
```

**What it does:** Switches the reviewer into maximum-adversarial mode. Scope expands beyond the original artifact to related components, callers, and dependencies. The standard of proof inverts: the implementation must prove its correctness, not the reviewer its incorrectness.

**Concrete example:**
> Trigger: 1 CRITICAL finding (auth bypass) in payment service.
> Expanded scope: Review all callers of `validateToken()` across the codebase.
> Additional findings:
> - `order-service.js:89` — calls `validateToken()` but ignores return value. CRITICAL.
> - `admin-panel/auth.js:34` — uses deprecated token format, bypass possible. HIGH.

---

## Step 9 — Explicit Gap Analysis

**Name:** Explicit Gap Analysis

**Trigger condition:** Fires during synthesis (end of review). Applied to all artifact types. Documents what is deliberately or accidentally absent.

**Output schema:**
```markdown
### Explicit Gap Analysis

#### Missing Requirements
- [What is absent and why it matters]

#### Unhandled Assumptions
- [Implicit assumption + risk if wrong]

#### Omitted Context
- [Information the artifact relies on but does not document]

#### Verdict impact
- Gaps that block: [list or "none"]
- Gaps that should be tracked: [list or "none"]
```

**What it does:** Explicitly catalogs what is MISSING from the artifact — not what is wrong with what is present. Covers missing requirements, unhandled assumptions, and deliberate omissions. Distinguishes between gaps that block progress and gaps that should be tracked for later.

**Concrete example:**
> Artifact: spec for notification service.
> Missing requirements: No mention of unsubscribe / opt-out flow (legal requirement in some jurisdictions).
> Unhandled assumptions: Assumes email service is always available (no fallback channel).
> Omitted context: SLA for delivery latency not stated; implementers will make incompatible assumptions.
> Verdict impact — blocks: opt-out flow must be added before implementation.
> Verdict impact — track: delivery SLA and fallback channel for Phase 2.
