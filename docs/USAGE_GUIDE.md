# QE Usage Guide

## 1. Install

Run in your terminal:

```bash
claude plugin marketplace add inho-team/qe-framework
claude plugin install qe-framework@inho-team-qe-framework
```

Update later with:

```bash
claude plugin update qe-framework@inho-team-qe-framework
```

## 2. Initialize a Project

Inside a Claude session:

```text
/Qinit
```

This creates:
- `CLAUDE.md`
- `.qe/`
- project analysis files
- optional `.qe/ai-team/` scaffolding when the user opts into role-based orchestration

## 3. Standard Workflow

### Plan

```text
/Qplan
```

Creates or updates planning artifacts in `.qe/planning/`.

### Spec

```text
/Qgs
```

Generates task specs from the active plan.

### Execute

```text
/Qatomic-run
```

- `single-model`: Claude/Haiku atomic swarm path
- `hybrid` / `multi-model`: configured implementer runner path

Use `/Qrun-task` instead when the work is not meaningfully atomic.

### Verify

```text
/Qcode-run-task
```

Runs the review/verification loop.

## 4. Mode Selection

### `single-model`

Use this when the user only has Claude or wants the legacy path.

- no role split required
- `/Qatomic-run` uses Haiku swarm
- simplest setup

### `hybrid`

Use this when only some roles should move to external runners.

Examples:
- Claude + Codex
- Claude + Gemini

### `multi-model`

Use this when all four roles should be explicitly assigned by role.

Example:
- planner = Claude
- implementer = Codex
- reviewer = Gemini
- supervisor = Claude

## 5. Recommended Subscription Presets

| Available tools | Suggested mode | Suggested default mapping |
|-----------------|----------------|---------------------------|
| Claude only | `single-model` | Claude owns all roles |
| Claude + Codex | `hybrid` | implementer = Codex, others = Claude |
| Claude + Gemini | `hybrid` | reviewer = Gemini, others = Claude |
| Claude + Codex + Gemini | `multi-model` | planner/supervisor = Claude, implementer = Codex, reviewer = Gemini |

## 6. Multi-Model Files

When `hybrid` or `multi-model` is enabled, QE uses:

- `.qe/ai-team/config/team-config.json`
- `.qe/ai-team/artifacts/role-spec.md`
- `.qe/ai-team/artifacts/task-bundle.json`
- `.qe/ai-team/artifacts/implementation-report.md`
- `.qe/ai-team/artifacts/review-report.md`
- `.qe/ai-team/artifacts/verification-report.md`

See [MULTI_MODEL_SETUP.md](MULTI_MODEL_SETUP.md) for details.

## 7. Quota-Blocked Runner Fallback

If Codex or Gemini is temporarily blocked by quota or subscription limits:

1. the workflow reports `blocked_quota`
2. fallback runners are suggested
3. `/Qatomic-run` or `/Qcode-run-task` should ask the user whether to borrow another runner for this run only
4. retry happens with `--role-override`

Example:

```bash
node scripts/run_team_workflow.mjs --config .qe/ai-team/config/team-config.json --from-role implementer --execute --role-override implementer=claude_implementer
```

This does not rewrite `team-config.json`.

## 8. Useful Commands

```text
/Qcommit
/Qrefresh
/Qcompact
/Qresume
/Qhelp
/Qsecret
/Qmcp-sync
```

## 9. Secret Management

Use `Qsecret` when you want QE to manage an API key or token without storing plaintext in the project.

Capabilities:
- metadata-only registries in `.qe/secrets/registry.json` or `~/.qe/secrets/registry.json`
- OS-backed secret storage
- one-run env injection into child processes

See [SECRETS.md](SECRETS.md) for commands and backend behavior.

## 10. When To Read Which Doc

- Philosophy and design intent: [PHILOSOPHY.md](PHILOSOPHY.md)
- Detailed role routing and config: [MULTI_MODEL_SETUP.md](MULTI_MODEL_SETUP.md)
- Shared MCP registry and client sync: [MCP_GLOBAL_SETUP.md](MCP_GLOBAL_SETUP.md)
- Secret storage and injection: [SECRETS.md](SECRETS.md)
- System components and hook architecture: [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)
- Full doc index: [DOCUMENTATION_MAP.md](DOCUMENTATION_MAP.md)
