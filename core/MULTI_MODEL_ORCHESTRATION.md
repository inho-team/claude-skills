# MULTI_MODEL_ORCHESTRATION.md

## Purpose

Extend QE Framework from a Claude-centric workflow into a model-agnostic role orchestration layer that fits the QE `PSE` chain.

The framework should treat:
- roles as stable workflow responsibilities
- providers/models as interchangeable execution engines
- artifacts as the contract between roles

This keeps the QE workflow portable across Claude, Gemini, Codex, GPT, or any future provider.

## Design Goal

The orchestration layer must answer:
1. Which role runs at each stage?
2. Which provider/model is assigned to that role?
3. What artifact does the role read?
4. What artifact must it produce?
5. Who can approve, reject, or request remediation?

## Core Principle

Do not couple workflow semantics to a single model vendor.

Bad:
- "Claude writes spec"
- "Gemini reviews"

Good:
- `planner` writes spec artifacts
- `implementer` modifies code within assigned ownership
- `reviewer` performs independent verification against the spec
- `supervisor` decides pass, fail, or remediation

Provider assignment is configuration, not architecture.

## Canonical Role Set

### planner
- Owns requirement interpretation
- Writes or updates task spec artifacts
- Defines acceptance criteria
- May split work into waves or partitions

### implementer
- Reads approved spec only
- Writes code, tests, docs, or configs
- Must not silently rewrite the spec
- Produces an implementation report

### reviewer
- Reads spec + implementation output
- Performs independent validation
- Must not become a second implementer
- Produces an approve or request_changes verdict with findings

### supervisor
- Synthesizes verification state
- Decides whether to accept, remediate, or escalate
- Owns retry policy and stop conditions

## Role Invariants

### planner invariants
- Only planner may materially rewrite scope or acceptance criteria
- Planner output must be explicit enough for implementer execution

### implementer invariants
- Implementer may refine tactics, not redefine goals
- Implementer must report changed files, executed checks, and unresolved risks

### reviewer invariants
- Reviewer should prefer concrete findings over general advice
- Reviewer must map each finding to the spec, changed files, or verification gaps

### supervisor invariants
- Supervisor owns the final gate
- Supervisor may request remediation but should not create net-new scope

## Artifact Contract

Artifacts should live under `.qe/ai-team/`.

### Required directories
```text
.qe/ai-team/
  config/
  artifacts/
  runs/
```

### Minimum artifact set
```text
.qe/ai-team/artifacts/
  role-spec.md
  task-bundle.json
  implementation-report.md
  review-report.md
  verification-report.md
```

### Artifact ownership
| Artifact | Owner | Mutability |
|----------|-------|------------|
| `role-spec.md` | planner | planner-only |
| `task-bundle.json` | planner | planner-only after approval |
| `implementation-report.md` | implementer | append/update by implementer |
| `review-report.md` | reviewer | reviewer-only |
| `verification-report.md` | supervisor | supervisor-only |

## Configuration Model

Project-level configuration should define:
- active workflow mode
- role to provider mapping
- fallback order
- review strictness
- remediation limits

Example:

```json
{
  "version": 1,
  "mode": "multi-model",
  "roles": {
    "planner": {
      "provider": "claude",
      "model": "sonnet",
      "responsibility": "Create and refine executable specs"
    },
    "implementer": {
      "provider": "codex",
      "model": "gpt-5-codex",
      "responsibility": "Implement approved checklist items"
    },
    "reviewer": {
      "provider": "gemini",
      "model": "gemini-2.5-pro",
      "responsibility": "Perform independent review and regression analysis"
    },
    "supervisor": {
      "provider": "claude",
      "model": "opus",
      "responsibility": "Approve, reject, or request remediation"
    }
  },
  "policies": {
    "max_remediation_rounds": 2,
    "reviewer_can_edit": false,
    "implementer_can_modify_spec": false
  }
}
```

## Execution Model

### Phase 1: Planning
Planner reads user intent, roadmap, and project state, then produces:
- `role-spec.md`
- `task-bundle.json`

### Phase 2: Implementation
Implementer reads approved planning artifacts and produces:
- code changes
- `implementation-report.md`

### Phase 3: Independent Review
Reviewer reads:
- `role-spec.md`
- `task-bundle.json`
- changed files or implementation report

Reviewer produces:
- `review-report.md`
- verdict: `approve` or `request_changes`

### Phase 4: Supervision
Supervisor reads all prior artifacts and produces:
- `verification-report.md`
- final decision: `pass`, `partial`, `fail`, `escalate`

## Decision State Machine

```text
draft_spec
  -> approved_spec
  -> implementation_complete
  -> review_passed -> supervised_pass -> complete
  -> review_failed -> remediation_requested -> implementation_complete
  -> supervision_failed -> remediation_requested -> implementation_complete
  -> max_rounds_exceeded -> escalated
```

## Why This Improves Outcomes

### 1. Reduces self-confirming failures
A single model often plans, implements, and justifies its own mistakes. Role separation adds adversarial pressure.

### 2. Stabilizes specs
The implementer is no longer allowed to silently reshape the task during execution.

### 3. Improves review quality
Independent review is structurally stronger than self-review, especially for regressions and omitted tests.

### 4. Lowers vendor lock-in
Changing providers becomes a config operation instead of a framework rewrite.

### 5. Enables cost tuning
Different roles can use different model classes based on complexity and budget.

## Integration With Existing QE Flow

Primary QE flow:
```text
/Qplan -> /Qgs -> /Qatomic-run -> /Qcode-run-task
```

Role mapping across the primary chain:
```text
/Qplan           -> planner
/Qgs             -> planner-spec output
/Qatomic-run     -> implementer
/Qcode-run-task  -> reviewer + supervisor verification loop
```

Secondary path:
```text
/Qrun-task
```

`/Qrun-task` remains valid for non-atomic or fallback execution, but it is not the canonical `Qplan` path.

In single-model mode, Claude may own all roles.
In multi-model mode, roles are distributed by config.

## Compatibility Strategy

### Mode 1: single-model
Default. Existing behavior remains valid.

### Mode 2: multi-model
Enabled when `.qe/ai-team/config/team-config.json` exists and `mode` is `multi-model`.

### Mode 3: hybrid
Use Claude for planning and supervision while delegating implementation or review externally.

## Minimal First-Pass Implementation

The first shipping version should provide:
1. Config schema and example file
2. Artifact naming conventions
3. Qinit support for scaffolding the config
4. Qplan and Qgs instructions to emit planner artifacts
5. Qatomic-run and Qcode-run-task instructions to honor role boundaries
6. Qrun-task guidance as a secondary path
7. Documentation for common role mappings

Native provider adapters can be added later.

## Native Adapter Roadmap

Future runtime support can add:
- provider adapters for Claude, Gemini, Codex, GPT
- CLI or API invocation wrappers
- artifact router and run ledger
- retry and quorum policies
- role-specific prompt registries

This document intentionally defines the architecture so that runtime automation can be added without changing workflow semantics.
