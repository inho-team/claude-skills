# QE Framework

Spec-driven task execution framework for Claude Code and Codex.

QE Framework turns vague work into an explicit workflow:

```text
/Qplan -> /Qgs -> /Qatomic-run -> /Qcode-run-task
```

It supports:
- `single-model`: Claude-centric legacy flow
- `multi-model` / `hybrid`: role-based orchestration across Claude, Codex, Gemini, or other runner-backed CLIs
- `tiered-model`: one-provider tiering such as Claude Opus / Sonnet / Haiku or Codex GPT-5.4 / GPT-5-Codex / GPT-5-Codex-Mini by difficulty

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
- Global MCP setup: [docs/MCP_GLOBAL_SETUP.md](docs/MCP_GLOBAL_SETUP.md)
- Secret management: [docs/SECRETS.md](docs/SECRETS.md)
- System overview: [docs/SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md)
- Terminal encoding notes: [docs/TERMINAL_ENCODING.md](docs/TERMINAL_ENCODING.md)
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
In `hybrid`, `multi-model`, or `tiered-model`, those roles can be mapped to different runners or tiers in `.qe/ai-team/config/team-config.json`.

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

Codex-first or npm-based installs should update with:

```bash
npm update -g @inho-team/qe-framework
```

If you are running directly from a local QE checkout, update the repo and then reinstall:

```bash
node install.js
```

Codex target installation is handled by the package postinstall step as well:

- skills are copied to `~/.codex/skills`
- agents are copied to `~/.codex/agents`
- `~/.codex/config.toml` gets a managed QE agent block

## Quick Start

1. Initialize a project:

```text
/Qinit
```

In Codex, invoke the installed skills by name:

```text
$Qinit
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
| `tiered-model` | High-difficulty planning/judgment use a high tier model, standard work uses a medium tier, and trivial work routes to a low tier. |

## Subscription Presets

Recommended presets for `/Qinit`:

| Available tools | Suggested mode | Suggested default mapping |
|-----------------|----------------|---------------------------|
| `Claude only` | `single-model` | Claude owns all roles; `/Qatomic-run` uses Haiku swarm |
| `Tiered Claude` | `tiered-model` | planner/supervisor = Opus, implementer/reviewer = Sonnet, low-tier helper = Haiku |
| `Tiered Codex` | `tiered-model` | planner/supervisor = GPT-5.4, implementer/reviewer = GPT-5-Codex, low-tier helper = GPT-5-Codex-Mini |
| `Claude + Codex` | `hybrid` | planner/reviewer/supervisor = Claude, implementer = Codex |
| `Claude + Gemini` | `hybrid` | planner/implementer/supervisor = Claude, reviewer = Gemini |
| `Claude + Codex + Gemini` | `multi-model` | planner = Claude, implementer = Codex, reviewer = Gemini, supervisor = Claude |

See [docs/MULTI_MODEL_SETUP.md](docs/MULTI_MODEL_SETUP.md) for the detailed role matrix.

`/Qinit` should collect both:
- provider per role
- model per runner

Recommended model defaults:
- Claude high tier: `opus`
- Claude medium tier: `sonnet`
- Claude low tier: `haiku`
- Codex high tier: `gpt-5.4`
- Codex medium tier: `gpt-5-codex`
- Codex low tier: `gpt-5-codex-mini`
- Gemini reviewer: `gemini-2.5-pro`

## Current Release

- Version: `3.0.26`
- Highlights:
  - role-based runner mapping
  - PATH-based Codex/Gemini execution
  - background runner supervision
  - quota-blocked fallback candidates with temporary `--role-override`
  - `AskUserQuestion` guidance for one-run reassignment in `/Qatomic-run` and `/Qcode-run-task`
  - OS-backed secret metadata and secure child-process injection via `Qsecret`
  - global MCP registry and QE MCP server sync for Claude, Codex, and Gemini

## Notes

- After install or update, restart Claude Code and any active Codex session.
- `team-config.json` matters whenever role routing is enabled: `hybrid`, `multi-model`, or `tiered-model`.
- `--role-override` affects the current run only. It does not rewrite saved config.

## License

MIT. See [LICENSE](LICENSE).
