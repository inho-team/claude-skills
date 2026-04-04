# QE Framework

Spec-driven task execution framework for Claude Code, with optional Codex integration.

QE Framework turns vague work into an explicit workflow:

```text
/Qplan -> /Qgs -> /Qatomic-run -> /Qcode-run-task
```

It supports:
- **Claude-only** (default): All SVS stages run on Claude
- **Claude + Codex**: Configure individual SVS stages to use Codex via [codex-plugin-cc](https://github.com/openai/codex-plugin-cc)

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
- Global MCP setup: [docs/MCP_GLOBAL_SETUP.md](docs/MCP_GLOBAL_SETUP.md)
- Secret management: [docs/SECRETS.md](docs/SECRETS.md)
- System overview: [docs/SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md)
- Terminal encoding notes: [docs/TERMINAL_ENCODING.md](docs/TERMINAL_ENCODING.md)
- Korean: [docs/README.ko.md](docs/README.ko.md)
- Japanese: [docs/README.ja.md](docs/README.ja.md)
- Chinese: [docs/README.zh.md](docs/README.zh.md)

## Core Idea

QE separates responsibilities into three explicit stages so planning, verification, and supervision do not collapse into one opaque step.

SVS pipeline:
- **Spec** (planning): generate executable specs
- **Verify** (verification): validate implementation
- **Supervise** (supervision): gate and report completion

By default, all stages run on Claude. To use Codex for specific stages, configure SVS routing (see below).

## Installation

Run these commands in your terminal.

Official install path:

1. Clone the repository and move to the target release:

```bash
git clone https://github.com/inho-team/qe-framework.git
cd qe-framework
git checkout v4.0.2
```

2. Build a local tarball:

```bash
npm pack --cache /tmp/qe-npm-cache
```

3. Install the tarball globally:

```bash
npm install -g ./inho-team-qe-framework-4.0.2.tgz
```

4. Sync Claude assets:

```bash
qe-framework-install
```

This installs:

- Claude commands into `~/.claude/commands`
- Claude agents into `~/.claude/agents`

Update path:

```bash
git pull
npm pack --cache /tmp/qe-npm-cache
npm install -g ./inho-team-qe-framework-4.0.2.tgz
qe-framework-install
```

Uninstall path:

```bash
qe-framework-uninstall
```

## SVS Engine Routing (Optional)

By default, all stages run on Claude. To route specific stages to Codex:

1. Install codex-plugin-cc:

```bash
/plugin install codex@openai-codex
```

2. Create `.qe/svs-config.json`:

```json
{
  "spec": { "engine": "claude" },
  "verify": { "engine": "codex", "model": "gpt-5.4-mini", "effort": "high" },
  "supervise": { "engine": "claude" }
}
```

3. Validate:

```bash
npm run qe:validate
```

If codex-plugin-cc is not installed, all stages gracefully fall back to Claude.

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

## Current Release

- Version: `4.0.2`
- Highlights:
  - Claude-first baseline: all SVS stages default to Claude
  - Optional Codex integration via codex-plugin-cc bridge
  - Simplified SVS config (spec/verify/supervise) instead of role-based orchestration
  - Graceful fallback to Claude if codex-plugin-cc is not installed
  - Removed direct integrations with Gemini/GPT—Codex-only bridge for extensions

## Notes

- After install or update, restart Claude Code and any active Codex session.
- `.qe/svs-config.json` is optional. Without it, all stages default to Claude.
- If codex-plugin-cc is not installed, Codex stages in `.qe/svs-config.json` will gracefully fall back to Claude.

## License

MIT. See [LICENSE](LICENSE).
