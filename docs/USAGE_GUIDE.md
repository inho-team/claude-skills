# QE Usage Guide

## 1. Install

Run in your terminal:

```bash
git clone https://github.com/inho-team/qe-framework.git
cd qe-framework
git checkout v3.0.27
npm pack --cache /tmp/qe-npm-cache
npm install -g ./inho-team-qe-framework-3.0.27.tgz
qe-framework-install
```

Update later with:

```bash
git pull
npm pack --cache /tmp/qe-npm-cache
npm install -g ./inho-team-qe-framework-3.0.27.tgz
qe-framework-install
```

Uninstall with:

```bash
qe-framework-uninstall
```

The install configures both targets:

- copies QE skills to `~/.codex/skills`
- copies QE agents to `~/.codex/agents`
- updates `~/.codex/config.toml` with QE-managed agent entries

## 2. Initialize a Project

Inside a Claude session:

```text
/Qinit
```

Inside a Codex session:

```text
$Qinit
```

This creates:
- default project instruction file (`CLAUDE.md`)
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
- `tiered-model`: high-tier planning/judgment with cheaper lower-tier execution

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

### `tiered-model`

Use this when you want to reduce total token cost without losing strong planning and validation.

Typical Claude setup:
- planner = Opus
- implementer = Sonnet
- reviewer = Sonnet
- supervisor = Opus
- low-complexity helper runner = Haiku

Typical Codex setup:
- planner = GPT-5.4
- implementer = GPT-5-Codex
- reviewer = GPT-5-Codex
- supervisor = GPT-5.4
- low-complexity helper runner = GPT-5-Codex-Mini

Current runtime behavior:
- planner and supervisor stay on the configured higher-tier runners
- reviewer stays on the configured review runner
- implementer can be auto-routed by `task-bundle.json` complexity in `tiered-model`

## 5. Recommended Subscription Presets

| Available tools | Suggested mode | Suggested default mapping |
|-----------------|----------------|---------------------------|
| Claude only | `single-model` | Claude owns all roles |
| Tiered Claude | `tiered-model` | planner/supervisor = Opus, implementer/reviewer = Sonnet, low-tier helper = Haiku |
| Tiered Codex | `tiered-model` | planner/supervisor = GPT-5.4, implementer/reviewer = GPT-5-Codex, low-tier helper = GPT-5-Codex-Mini |
| Claude + Codex | `hybrid` | implementer = Codex, others = Claude |
| Claude + Gemini | `hybrid` | reviewer = Gemini, others = Claude |
| Claude + Codex + Gemini | `multi-model` | planner/supervisor = Claude, implementer = Codex, reviewer = Gemini |

## 6. Role-Orchestration Files

When `hybrid`, `multi-model`, or `tiered-model` is enabled, QE uses:

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
