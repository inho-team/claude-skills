# QE Framework

Spec-driven task execution framework for Claude Code.

QE Framework turns vague work into an explicit workflow:

```text
/Qplan -> /Qgs -> /Qatomic-run -> /Qcode-run-task
```

It supports both:
- `single-model`: Claude-centric legacy flow
- `multi-model` / `hybrid`: role-based orchestration across Claude, Codex, Gemini, or other runner-backed CLIs

## What This README Is

This file is now the entry point, not the full manual.

Use it to:
- understand what QE Framework is
- install and initialize it
- find the right documentation quickly

## Documentation Map

- Philosophy: [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md)
- Detailed usage guide: [docs/USAGE_GUIDE.md](docs/USAGE_GUIDE.md)
- Documentation map: [docs/DOCUMENTATION_MAP.md](docs/DOCUMENTATION_MAP.md)
- Multi-model setup: [docs/MULTI_MODEL_SETUP.md](docs/MULTI_MODEL_SETUP.md)
- System overview: [docs/SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md)
- Korean: [docs/README.ko.md](docs/README.ko.md)
- Japanese: [docs/README.ja.md](docs/README.ja.md)
- Chinese: [docs/README.zh.md](docs/README.zh.md)

## Core Idea

QE separates responsibilities so planning, implementation, review, and final supervision do not collapse into one opaque step.

Recommended role split:
- `planner`
- `implementer`
- `reviewer`
- `supervisor`

In `single-model`, Claude can own all roles.
In `hybrid` or `multi-model`, those roles can be mapped to different runners in `.qe/ai-team/config/team-config.json`.

## Installation

Run these commands in your terminal, not inside a Claude session.

1. Install Claude Code CLI if needed:

```bash
claude install
```

2. Register the marketplace:

```bash
claude plugin marketplace add inho-team/qe-framework
```

3. Install the plugin:

```bash
claude plugin install qe-framework@inho-team-qe-framework
```

4. Update later with:

```bash
claude plugin update qe-framework@inho-team-qe-framework
```

## Quick Start

1. Initialize a project:

```text
/Qinit
```

2. Plan:

```text
/Qplan
```

3. Generate executable spec:

```text
/Qgs
```

4. Execute:

```text
/Qatomic-run
```

5. Verify and gate completion:

```text
/Qcode-run-task
```

## Runtime Modes

| Mode | Purpose |
|------|---------|
| `single-model` | Claude-only projects. `/Qatomic-run` uses the legacy Haiku swarm path. |
| `hybrid` | Some roles stay on Claude, some roles use external runners. |
| `multi-model` | Planner, implementer, reviewer, supervisor are explicitly mapped by role. |

## Subscription Presets

Recommended presets for `/Qinit`:

| Available tools | Suggested mode | Suggested default mapping |
|-----------------|----------------|---------------------------|
| `Claude only` | `single-model` | Claude owns all roles; `/Qatomic-run` uses Haiku swarm |
| `Claude + Codex` | `hybrid` | planner/reviewer/supervisor = Claude, implementer = Codex |
| `Claude + Gemini` | `hybrid` | planner/implementer/supervisor = Claude, reviewer = Gemini |
| `Claude + Codex + Gemini` | `multi-model` | planner = Claude, implementer = Codex, reviewer = Gemini, supervisor = Claude |

See [docs/MULTI_MODEL_SETUP.md](docs/MULTI_MODEL_SETUP.md) for the detailed role matrix.

## Current Release

- Version: `3.0.13`
- Highlights:
  - role-based runner mapping
  - PATH-based Codex/Gemini execution
  - background runner supervision
  - quota-blocked fallback candidates with temporary `--role-override`
  - `AskUserQuestion` guidance for one-run reassignment in `/Qatomic-run` and `/Qcode-run-task`

## Notes

- After plugin install or update, restart Claude Code.
- `team-config.json` only matters when using `hybrid` or `multi-model`.
- `--role-override` affects the current run only. It does not rewrite saved config.

## License

MIT. See [LICENSE](LICENSE).
