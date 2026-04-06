# QE Framework

**Spec-driven task execution framework for Claude Code**

> 165 skills | 21 agents | Folder-aware context memory | SIVS quality gate

```
/Qplan  →  /Qgs  →  /Qatomic-run  →  /Qcode-run-task
 Plan       Spec     Execute          Verify
```

---

## Why QE Framework?

Claude Code is powerful, but raw Claude lacks **structured workflow**, **context optimization**, and **quality enforcement**. QE Framework adds these layers:

```
┌─────────────────────────────────────────────────┐
│                  QE Framework                   │
│                                                 │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │
│  │  Context   │  │   SIVS    │  │   165+      │ │
│  │  Memory    │  │   Loop    │  │   Skills    │ │
│  │  Manager   │  │   Engine  │  │   Library   │ │
│  └─────┬─────┘  └─────┬─────┘  └──────┬──────┘ │
│        │              │               │         │
│        └──────────────┼───────────────┘         │
│                       │                         │
│              ┌────────┴────────┐                │
│              │   Claude Code   │                │
│              └─────────────────┘                │
└─────────────────────────────────────────────────┘
```

| Problem | QE Solution |
|---------|-------------|
| Context window fills with irrelevant info | **Folder-aware context** — loads only what matches your working directory |
| No structured workflow for complex tasks | **PSE Chain** — Plan → Spec → Execute → Verify pipeline |
| Quality depends on prompt quality | **SIVS Loop** — automated Spec → Implement → Verify → Supervise gate |
| No model routing control | **SIVS Config** — route each stage to Claude or Codex independently |
| Token waste on repeated scans | **Context Memory** — pre-analyzed project knowledge, auto-refreshed |

---

## Install

```bash
git clone https://github.com/inho-team/qe-framework.git
cd qe-framework
npm pack --cache /tmp/qe-npm-cache
npm install -g ./inho-team-qe-framework-6.0.1.tgz
qe-framework-install
```

**Update:**
```bash
git pull
npm pack --cache /tmp/qe-npm-cache
npm install -g ./inho-team-qe-framework-6.0.1.tgz
qe-framework-install
```

---

## Quick Start

```
/Qinit                    # Initialize project + context memory
/Qcontext init            # Set up folder-aware context partitioning
/Qplan                    # Create roadmap and phases
/Qgs Phase 1: ...        # Generate spec (TASK_REQUEST + VERIFY_CHECKLIST)
/Qatomic-run              # Execute via parallel Haiku Wave
/Qcode-run-task           # Test → review → fix quality loop
```

---

## Architecture

### PSE Chain (User Workflow)

The 4-step pipeline that drives all work:

| Step | Skill | What it does |
|------|-------|-------------|
| **Plan** | `/Qplan` | Roadmap, phases, requirements |
| **Spec** | `/Qgs` | TASK_REQUEST + VERIFY_CHECKLIST generation |
| **Execute** | `/Qatomic-run` | Parallel Wave execution with Haiku Teammates |
| **Verify** | `/Qcode-run-task` | Test → review → fix quality loop |

`/Qrun-task` is the sequential fallback when tasks can't be parallelized.

### SIVS Loop (Quality Gate)

Runs inside Execute and Verify steps:

```
     ┌──────────────────────────────────────┐
     │            SIVS Loop                 │
     │                                      │
     │  Spec ──► Implement ──► Verify ──►  │
     │   (S)       (I)          (V)        │
     │                                      │
     │              ┌─── PASS ──► Done     │
     │   Supervise ─┤                       │
     │     (S)      └─── FAIL ──► Remediate │
     │                     │                │
     │                     └──► Spec (retry)│
     └──────────────────────────────────────┘
```

Each stage can be routed to **Claude** (default) or **Codex** (optional):

```
/Qsivs-config                              # View current routing
/Qsivs-config implement codex --effort high # Route implement to Codex
/Qsivs-config reset --all                  # Reset all to Claude
```

### Folder-Aware Context Memory

**The key differentiator.** Instead of loading one massive CLAUDE.md, QE partitions context by folder:

```
.qe/context/
├── _registry.json       # folder ↔ context mapping
├── root.md              # always loaded (project-wide rules)
├── frontend.md          # loaded only in src/frontend/**
├── backend.md           # loaded only in src/backend/**
└── scripts.md           # loaded only in scripts/**
```

```
Working in src/frontend/components/Button.tsx
  → Loads: root.md + frontend.md
  → Skips: backend.md, scripts.md, infra.md
  → Result: ~60% less context token usage
```

| Command | Description |
|---------|-------------|
| `/Qcontext init` | Initialize context partitioning |
| `/Qcontext add backend "src/backend/**"` | Add a folder context |
| `/Qcontext show` | View all contexts + staleness status |
| `/Qcontext refresh` | Auto-update stale contexts |
| `/Qcontext status src/api/` | Preview which contexts would load |

Auto-refreshed via `/Qrefresh` integration.

### Model Tiering

| Model | Use | Examples |
|-------|-----|---------|
| **Haiku** | Simple, parallel tasks | Wave Teammates, archiving, data refresh |
| **Sonnet** | Code implementation | Etask-executor, Ecode-reviewer |
| **Opus** | Strategy, architecture | /Qplan, Edeep-researcher |

Delegation Enforcer auto-injects the correct model via pre-tool-use hook.

### Token Efficiency (Enforced)

| Mechanism | Behavior |
|-----------|----------|
| **Folder Context** | Loads only relevant context per working directory |
| **ContextMemo** | Blocks duplicate file reads at hook level (`exit 2`) |
| **Auto-compaction** | Triggers Ecompact-executor at 140k tokens, mandatory at 170k |
| **Persistent Mode** | Prevents Claude from stopping mid-pipeline |
| **Skill size limit** | 250 lines max per SKILL.md, excess → `references/` |

---

## Skill Library (165 skills)

### Core Skills

| Category | Skills | Count |
|----------|--------|-------|
| **Core PSE** | `Qplan` `Qgs` `Qatomic-run` `Qrun-task` `Qcode-run-task` `Qinit` | 6 |
| **Context & Config** | `Qcontext` `Qsivs-config` `Qrefresh` `Qmemory` `Qcompact` | 5 |
| **Project** | `Qmap-codebase` `Qcommit` `Qbranch` `Qarchive` `Qproject-sync` | 5 |
| **PM** | `Qpm-prd` `Qpm-roadmap` `Qpm-okr` `Qpm-retro` `Qpm-strategy` `Qpm-gtm` | 6 |
| **Quality** | `Qsystematic-debugging` `Qtest-driven-development` `Qgc` `Qsource-verifier` | 4 |
| **Docs & Output** | `Qdocx` `Qpdf` `Qpptx` `Qxlsx` `Qdoc-converter` `Qdoc-comment` | 6 |
| **Academic** | `Qgrad-paper-write` `Qgrad-research-plan` `Qgrad-seminar-prep` `Qgrad-thesis-manage` | 4 |
| **Research** | `Qautoresearch` `Qfact-checker` `Qsource-verifier` `Qdata-analysis` | 4 |
| **More** | `/Qfind-skills` or `/Qhelp` to discover all | 54+ |

### Coding Expert Skills (71 experts)

Domain-specific best practices organized by category:

```
coding-experts/
├── backend/      14 experts    ├── frontend/    12 experts
├── languages/    13 experts    ├── infra/       14 experts
├── quality/      12 experts    └── data/         6 experts
```

<details>
<summary><b>Backend (14)</b></summary>

| Expert | Domain |
|--------|--------|
| `Qapi-designer` | REST API design, OpenAPI |
| `Qarchitecture-designer` | System design, ADR |
| `Qdjango-expert` | Django, DRF |
| `Qdotnet-core-expert` | .NET Core, EF |
| `Qfastapi-expert` | FastAPI, async SQLAlchemy |
| `Qgraphql-architect` | GraphQL, Federation |
| `Qlaravel-specialist` | Laravel, Eloquent |
| `Qlegacy-modernizer` | Legacy migration |
| `Qmcp-developer` | MCP protocol, SDK |
| `Qmicroservices-architect` | Microservices patterns |
| `Qnestjs-expert` | NestJS, DI |
| `Qrails-expert` | Rails, Hotwire |
| `Qspring-boot-engineer` | Spring Boot |
| `Qwebsocket-engineer` | WebSocket, scaling |

</details>

<details>
<summary><b>Frontend (12)</b></summary>

| Expert | Domain |
|--------|--------|
| `Qangular-architect` | Angular, NgRx, RxJS |
| `Qflutter-expert` | Flutter, Bloc, Riverpod |
| `Qgame-developer` | Unity, Unreal, ECS |
| `Qnextjs-developer` | Next.js App Router, RSC |
| `Qreact-best-practices` | React performance rules |
| `Qreact-expert` | React 19, hooks, state |
| `Qreact-native-expert` | React Native, Expo |
| `Qvite` | Vite, Rolldown |
| `Qvue-best-practices` | Vue 3 performance rules |
| `Qvue-expert` | Vue 3 + TypeScript |
| `Qvue-expert-js` | Vue 3 + JavaScript |
| `Qweb-design-guidelines-vercel` | Vercel design system |

</details>

<details>
<summary><b>Languages (13)</b></summary>

| Expert | Domain |
|--------|--------|
| `Qcpp-pro` | Modern C++, concurrency |
| `Qcsharp-developer` | C#, ASP.NET, Blazor |
| `Qembedded-systems` | MCU, RTOS, protocols |
| `Qgolang` / `Qgolang-pro` | Go patterns, concurrency |
| `Qjava-architect` | Spring, JPA, WebFlux |
| `Qjs-ts-expert` | JavaScript/TypeScript |
| `Qkotlin-specialist` | Kotlin, KMP, Compose |
| `Qphp-pro` | PHP, Laravel, Symfony |
| `Qpython-pro` | Python, async, typing |
| `Qrust-engineer` | Rust, ownership, async |
| `Qsql-pro` | SQL optimization |
| `Qswift-expert` | Swift, SwiftUI |

</details>

<details>
<summary><b>Infra (14)</b></summary>

| Expert | Domain |
|--------|--------|
| `Qatlassian-mcp` | Jira, Confluence MCP |
| `Qchaos-engineer` | Chaos testing |
| `Qcli-developer` | CLI tools (Go/Node/Python) |
| `Qcloud-architect` | AWS, GCP, Azure |
| `Qdatabase-optimizer` | DB performance tuning |
| `Qdevops-engineer` | CI/CD, Docker, K8s |
| `Qkubernetes-specialist` | K8s, Helm, GitOps |
| `Qmonitoring-expert` | Observability, alerting |
| `Qpostgres-pro` | PostgreSQL advanced |
| `Qsalesforce-developer` | Apex, LWC |
| `Qshopify-expert` | Shopify, Liquid |
| `Qsre-engineer` | SRE, SLO/SLI |
| `Qterraform-engineer` | Terraform, IaC |
| `Qwordpress-pro` | WordPress, Gutenberg |

</details>

<details>
<summary><b>Quality (12) & Data (6)</b></summary>

**Quality:**

| Expert | Domain |
|--------|--------|
| `Qcode-documenter` | Code documentation |
| `Qcode-reviewer` | Code review |
| `Qdebugging-wizard` | Systematic debugging |
| `Qfeature-forge` | Feature spec mining |
| `Qfullstack-guardian` | Full-stack patterns |
| `Qplaywright-expert` | E2E testing |
| `Qsecure-code-guardian` | OWASP, security |
| `Qsecurity-reviewer` | Security audit |
| `Qspec-miner` | Spec analysis |
| `Qtest-master` | Test strategy |
| `Qthe-fool` | Devil's advocate |
| `Qvitest` | Vitest testing |

**Data:**

| Expert | Domain |
|--------|--------|
| `Qfine-tuning-expert` | Model fine-tuning |
| `Qml-pipeline` | ML pipelines |
| `Qpandas-pro` | Pandas, DataFrames |
| `Qprompt-engineer` | Prompt engineering |
| `Qrag-architect` | RAG systems |
| `Qspark-engineer` | Apache Spark |

</details>

---

## Agent Fleet (21 agents)

| Agent | Role |
|-------|------|
| **Etask-executor** | Complex checklist implementation (5+ items) |
| **Eqa-orchestrator** | Test → review → fix quality loop |
| **Esupervision-orchestrator** | Routes to domain supervisors, aggregates grades |
| **Ecode-reviewer** | Code review after changes |
| **Ecode-test-engineer** | Test writing and coverage |
| **Ecommit-executor** | AI-trace-free git commits |
| **Erefresh-executor** | Project analysis + context refresh |
| **Edeep-researcher** | Multi-source research |
| **Esecurity-officer** | Security audit on diffs |
| **Ecompact-executor** | Context window pressure management |
| **Epm-planner** | PRD, roadmap, document generation |
| +10 more | Archiving, profiling, handoff, doc generation... |

---

## Configuration

### SIVS Engine Routing

```bash
/Qsivs-config                    # Show current routing
/Qsivs-config implement codex    # Route implement stage to Codex
/Qsivs-config --help             # Full usage guide
```

Config file: `.qe/sivs-config.json`

```json
{
  "spec":      { "engine": "claude" },
  "implement": { "engine": "codex", "model": "gpt-5.4", "effort": "high" },
  "verify":    { "engine": "claude" },
  "supervise": { "engine": "claude" }
}
```

### Folder Context Memory

```bash
/Qcontext init                              # Initialize
/Qcontext add frontend "src/frontend/**"    # Add folder context
/Qcontext show                              # View all + staleness
/Qcontext refresh                           # Update stale contexts
/Qcontext --help                            # Full usage guide
```

---

## Project Structure

```
qe-framework/
├── skills/                  # 165 skill definitions
│   ├── Q*/                  # 87 user-facing skills
│   ├── M*/                  # 7 maintenance skills
│   └── coding-experts/      # 71 domain expert skills
├── agents/                  # 21 agent definitions
├── core/                    # Principles, schemas, rules
├── scripts/                 # Runtime utilities + shared libs
├── hooks/                   # Git/session hooks
├── docs/                    # Guides and references
└── .qe/                    # Project state (per-project)
    ├── context/             # Folder-aware context memory
    ├── sivs-config.json     # Engine routing config
    └── tasks/               # Task tracking
```

---

## Documentation

| Doc | Path |
|-----|------|
| System Overview | [docs/SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md) |
| Philosophy | [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md) |
| Usage Guide | [docs/USAGE_GUIDE.md](docs/USAGE_GUIDE.md) |
| Conventions | [QE_CONVENTIONS.md](QE_CONVENTIONS.md) |
| Secret Management | [docs/SECRETS.md](docs/SECRETS.md) |
| Multi-Model Setup | [docs/MULTI_MODEL_SETUP.md](docs/MULTI_MODEL_SETUP.md) |

| Language | Path |
|----------|------|
| Korean | [docs/README.ko.md](docs/README.ko.md) |
| Japanese | [docs/README.ja.md](docs/README.ja.md) |
| Chinese | [docs/README.zh.md](docs/README.zh.md) |

---

## Version

`6.0.1` — Folder-aware context memory, SIVS config CLI, 165 skills, 71 coding experts.

## License

MIT. See [LICENSE](LICENSE).
