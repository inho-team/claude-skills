# QE Framework

Spec-driven task execution framework for Claude Code.

```
/Qplan  →  /Qgs  →  /Qatomic-run  →  /Qcode-run-task
 Plan       Spec     Execute          Verify
```

93 skills, 22 agents, enforced token efficiency.

## Install

```bash
git clone https://github.com/inho-team/qe-framework.git
cd qe-framework
git checkout v5.0.0
npm pack --cache /tmp/qe-npm-cache
npm install -g ./inho-team-qe-framework-5.0.0.tgz
qe-framework-install
```

Update:

```bash
git pull
npm pack --cache /tmp/qe-npm-cache
npm install -g ./inho-team-qe-framework-5.0.0.tgz
qe-framework-install
```

Installs 93 skills into `~/.claude/commands` and 22 agents into `~/.claude/agents`.

## Quick Start

```
/Qinit              # Initialize project
/Qplan              # Create roadmap and phases
/Qgs Phase 1: ...  # Generate spec (TASK_REQUEST + VERIFY_CHECKLIST)
/Qatomic-run        # Execute via parallel Haiku Wave
/Qcode-run-task     # Test → review → fix quality loop
```

## Architecture

### PSE Chain (user workflow)

The 4-step pipeline that drives all work:

| Step | Skill | What it does |
|------|-------|-------------|
| Plan | `/Qplan` | Roadmap, phases, requirements |
| Spec | `/Qgs` | TASK_REQUEST + VERIFY_CHECKLIST |
| Execute | `/Qatomic-run` | Parallel Wave execution with Haiku Teammates |
| Verify | `/Qcode-run-task` | Test → review → fix quality loop |

`/Qrun-task` is the sequential fallback when tasks can't be parallelized.

### SVS Loop (quality gate)

Runs inside Execute and Verify steps:

```
Spec → Verify → Supervise → (FAIL) Remediate → Spec → ...
```

### Model Tiering

| Model | Use | Examples |
|-------|-----|---------|
| Haiku | Simple, parallel tasks | Wave Teammates, archiving, data refresh |
| Sonnet | Code implementation | Etask-executor, Ecode-reviewer |
| Opus | Strategy, architecture | /Qplan, Edeep-researcher |

Delegation Enforcer auto-injects the correct model via pre-tool-use hook.

### Token Efficiency (Enforced)

| Mechanism | Behavior |
|-----------|----------|
| **ContextMemo** | Blocks duplicate file reads at hook level (`exit 2`) |
| **Auto-compaction** | Triggers Ecompact-executor at 140k tokens, mandatory at 170k |
| **Persistent Mode** | Prevents Claude from stopping mid-pipeline |
| **Skill size limit** | 250 lines max per SKILL.md, excess → `references/` |

### Cross-Phase Regression

Before completing Phase N, prior phases' verification items are re-checked to prevent regression.

### Project Memory

```
/Qmemory add "This project uses pnpm" --type convention --priority permanent
/Qmemory list
```

Cross-session knowledge with TTL (permanent / 30d / 7d / 1d). Auto-pruned at session start.

## Key Skills

| Category | Skills |
|----------|--------|
| Core | `Qplan` `Qgs` `Qatomic-run` `Qrun-task` `Qcode-run-task` `Qinit` |
| Project | `Qmap-codebase` `Qrefresh` `Qcommit` `Qcompact` `Qmemory` `Qarchive` |
| PM | `Qpm-prd` `Qpm-roadmap` `Qpm-okr` `Qpm-retro` `Qpm-strategy` |
| Quality | `Qcode-reviewer` `Qtest-master` `Qplaywright-expert` `Qsecurity-reviewer` |
| Docs | `Qdocx` `Qpdf` `Qpptx` `Qxlsx` `Qdoc-converter` |
| Academic | `Qgrad-paper-write` `Qgrad-research-plan` `Qgrad-seminar-prep` |
| 70+ more | `/Qfind-skills` or `/Qhelp` |

## Documentation

| Doc | Path |
|-----|------|
| Philosophy | [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md) |
| System overview | [docs/SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md) |
| Conventions | [QE_CONVENTIONS.md](QE_CONVENTIONS.md) |
| Terminology | [QE_CONVENTIONS.md#terminology-glossary](QE_CONVENTIONS.md) |
| Secret management | [docs/SECRETS.md](docs/SECRETS.md) |
| Korean | [docs/README.ko.md](docs/README.ko.md) |
| Japanese | [docs/README.ja.md](docs/README.ja.md) |
| Chinese | [docs/README.zh.md](docs/README.zh.md) |

## Version

`5.0.0` — Claude-only baseline with enforced token efficiency, competitive features from OMC/GSD analysis.

## License

MIT. See [LICENSE](LICENSE).
