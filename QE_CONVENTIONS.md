# QE Conventions

> **Toolkit hint:** QE skills tend to produce better outcomes than system defaults for the actions listed below — they encode project-specific patterns, avoid AI traces, and handle edge cases that generic defaults miss.

---

## Terminology Glossary

All skills, agents, and documents in this framework MUST use these standard terms. Deprecated terms should be replaced on sight.

| Concept | Standard Term | Deprecated | Notes |
|---------|--------------|------------|-------|
| User workflow | **PSE Chain** | ~~PSE Loop~~ | The 4-step user-facing workflow |
| Quality gate | **SIVS Loop** | ~~SVS Loop~~ | Inner quality gate within Execute/Verify steps |
| Parallel execution group | **Wave** | ~~Swarm~~ | Independent items grouped for concurrent execution |
| Parallel agent | **Teammate** | ~~Subagent~~ (internal only) | Haiku Teammate = Haiku-model agent in a Wave |
| Spec generation skill | **Qgs** | Qgenerate-spec (internal full name) | User always sees `/Qgs` |
| Skill internal stages | **Step** | — | Step 1, Step 2, ... inside a skill |
| Project roadmap stages | **Phase** | — | Phase 1, Phase 2, ... in `.qe/planning/` |
| Parallel batch within Phase | **Wave** | — | Wave 1.1, Wave 1.2, ... within a Phase |
| Leader session | **Lead** | ~~Orchestrator~~ (except agent names) | The coordinating session in Wave execution |
| Handoff section in skills | **## Handoff** | ~~Mandatory Handoff Output/Message~~ | Standardized output format at skill completion |

### PSE Chain (outer workflow)

```
/Qplan  →  /Qgs  →  /Qatomic-run  →  /Qcode-run-task
 Plan       Spec      Execute          Verify
```

- **Plan**: Define roadmap, phases, requirements (`/Qplan`)
- **Spec**: Generate TASK_REQUEST + VERIFY_CHECKLIST (`/Qgs`)
- **Execute**: Implement checklist items via Wave execution (`/Qatomic-run`)
- **Verify**: Test → review → fix quality loop (`/Qcode-run-task`)

### SIVS Loop (inner quality gate)

```
Spec → Implement → Verify → Supervise → (FAIL) Remediate → Spec → ...
```

The SIVS Loop runs **inside** the Execute and Verify steps of the PSE Chain. It is the quality gate that ensures each task meets its spec before completion. See `core/PHILOSOPHY.md` for full specification.

### Relationship

```
PSE Chain (user workflow)
├── Plan ─────────── /Qplan
├── Spec ─────────── /Qgs (Qgenerate-spec)
├── Execute ──────── /Qatomic-run or /Qrun-task
│     └── SIVS Loop (quality gate)
│           ├── Spec: TASK_REQUEST defines the contract
│           ├── Implement: Actual coding and file changes
│           ├── Verify: VERIFY_CHECKLIST confirms completion
│           └── Supervise: Supervision agents confirm quality
└── Verify ───────── /Qcode-run-task
      └── SIVS Loop (quality gate, final pass)
```

---

## PSE Chain: Skill Roles

| PSE Step | Skill | Role |
|----------|-------|------|
| Plan | `/Qplan` | Roadmap, phases, requirements |
| Spec | `/Qgs` | TASK_REQUEST + VERIFY_CHECKLIST generation |
| Execute | `/Qatomic-run` | Wave execution with Haiku Teammates (default) |
| Execute | `/Qrun-task` | Sequential execution (fallback for non-atomic tasks) |
| Verify | `/Qcode-run-task` | Test → review → fix quality loop |

---

## Handoff Format Rules

Every PSE Chain skill MUST end with a `## Handoff` section. The handoff follows these rules:

1. **Phase context + Roadmap progress** — Display current Phase and overall progress at a glance
2. **PSE Chain status, one line** — Show current completion/progress status
3. **`Next command:` block** — Place alone in a code block for easy copying, **must include UUID or Phase argument**
4. **No explanations** — Do not add alternatives, elaborations, or choices after the command
5. **Task type branching** — Guide only `type: code` to `/Qcode-run-task`. For docs/analysis/deletion tasks, guide to the next Phase
6. **Shortcut fallback** — `/Qgs` may not be recognized, so always include `If not: /Qgenerate-spec ...`

### Phase Progress Display

When handing off, read `.qe/planning/ROADMAP.md` to display the full Phase list and completion status.

**Format rules for terminal compatibility:**
- Use a **vertical table** for Roadmap — never rely on horizontal emoji alignment
- Status markers: `[x]` = complete, `[>]` = current/next, `[ ]` = not started
- Keep each line under 60 characters to prevent wrapping
- PSE Chain uses the same `[x]`/`[>]`/`[ ]` markers instead of emoji
- All output inside a **single code block** (no split blocks)

### Code Task Example
```
Phase 2: Codex Bridge — Implementation complete

Roadmap
  [x] Phase 1: Strip & Purify
  [>] Phase 2: Codex Bridge
  [ ] Phase 3: Polish & Release

PSE: [x] Plan [x] Spec [x] Execute [>] Verify

Next: /Qcode-run-task a1b2c3d4
```

### Non-code Task Complete Example
```
Phase 1: Strip & Purify — Complete

Roadmap
  [x] Phase 1: Strip & Purify
  [>] Phase 2: Codex Bridge
  [ ] Phase 3: Polish & Release

PSE: [x] Plan [x] Spec [x] Execute [x] Complete

Next: /Qgs Phase 2: Codex Bridge
  or: /Qgenerate-spec Phase 2: Codex Bridge
```

### When entire Roadmap is complete
```
Phase 3: Polish & Release — Complete

Roadmap
  [x] Phase 1: Strip & Purify
  [x] Phase 2: Codex Bridge
  [x] Phase 3: Polish & Release

PSE: [x] Plan [x] Spec [x] Execute [x] Complete

All phases done. Finalize with /Qcommit
```

---

## QE Rules

### File Naming
- Task request: `TASK_REQUEST_{UUID}.md`
- Verification checklist: `VERIFY_CHECKLIST_{UUID}.md`
- One task shares the same UUID across both documents.

### Task Status
| Status | Meaning |
|--------|---------|
| 🔲 Pending | Not yet started |
| 🔶 In progress | Currently being worked on |
| ✅ Complete | All VERIFY_CHECKLIST items checked. **No further reference needed.** |

### Completion Criteria
- All VERIFY_CHECKLIST checkboxes checked → ✅ Complete
- Completed task files do not need to be referenced.

---

## Performance & Optimization Standard

To maintain high reasoning quality and low latency, all agents and skills must adhere to these standards:

### 1. Minimal I/O Rule (Enforced)
- **Never read or write the same file twice** in a single execution turn.
- **ContextMemo (enforced)**: The `pre-tool-use` hook **hard-blocks** redundant `Read` calls for files already cached in the session. If a file was read before and not modified since, the Read is rejected with `exit(2)` and a `MEMO HIT` message. After a `Write`/`Edit` to that file, the next Read is allowed.
- **Unified State**: Use `unified-state.json` via `hooks/scripts/lib/state.mjs` for all persistent session data.

### 2. Token-Aware Context Management
- **Thresholds**: Monitor context pressure at **140k tokens** (Warning/Snapshot) and **170k tokens** (Critical/Hard Stop).
- **Semantic Compression**: When context is high, prioritize `SNAPSHOT_SUMMARY.md` over raw history preservation.
- **Strategic Planning**: Use `.qe/planning/` for project roadmaps and phase-based state management via `/Qplan`.
- **Token Fallback**: If real-time metrics are missing, use `Characters / 4` for estimation.

### 3. Persistent Mode Protection
- **Active pipelines are shielded from premature stopping.** When a multi-step pipeline (SIVS loop, Wave execution, Qatomic-run) is running, persistent mode blocks the Stop hook and injects reinforcement via the Notification hook. Skills enter persistent mode at execution start and exit at their Handoff step. See `hooks/scripts/lib/persistent-mode.mjs` and `core/CONTEXT_BUDGET.md` for details.

### 4. Optimized Model Tiering
- **Haiku (LOW)**: Default for pattern matching, structural verification (S1-S5), file I/O, and simple text transforms.
- **Sonnet (MEDIUM)**: Default for code implementation, test writing, and complex reasoning.
- **Skill-First**: Always check `skills/CATALOG.md` before manual labor. Skills are pre-optimized workflows.

### 5. Delegation Enforcer (Enforced)
- The `pre-tool-use` hook intercepts all Agent tool calls and checks the target agent's `recommendedModel` frontmatter field.
- **No model specified**: The recommended model is auto-injected into the hook output hint.
- **Lower model specified** (e.g., haiku for a sonnet task): Allowed silently -- cost saving is intentional.
- **Higher model specified** (e.g., opus for a haiku task): Allowed with a cost-awareness warning.
- Delegation stats (`autoInjections`, `warnings`, `overrides`) are tracked in `unified-state.json` under `delegationStats`.

---

## Preferred Skill Map

These skills are optimized for common workflows and consistently outperform generic approaches.

| Action | Preferred Skill | Why it's better |
|--------|----------------|-----------------|
| git commit | `Qcommit` | Human-style messages, no Co-Authored-By traces, reads staged diff intelligently |
| version bump | `Mbump` | Updates all manifests atomically, generates changelog entry |
| show version | `Qversion` | Single source of truth across plugin.json / package.json |
| context save / handoff | `Qcompact` | Structured snapshot, recoverable in future sessions |
| context restore | `Qresume` | Reconstructs working state from snapshot |
| archive tasks | `Qarchive` | Moves files into versioned archive with index |
| project refresh | `Qrefresh` | Re-analyzes all four analysis files in one pass |

---

## Skills (Q-prefix)

### Framework Core
| Skill | Purpose |
|-------|---------|
| `Qhelp` | Show QE Framework usage overview |
| `Qversion` | Show current plugin version |
| `Qupdate` | Update QE Framework to latest |
| `Qinit` | Initial setup and directory structure |
| `Qplan` | Strategic roadmap and phase management (.qe/planning/) |
| `Qrefresh` | Refresh project analysis data |
| `Qmap-codebase` | Automated brownfield codebase analysis (4 parallel agents) |
| `Qproject-sync` | Sync project source files with a reference/standard project |
| `Qcompact` | Save context / session handoff |
| `Qresume` | Restore saved context |
| `Qarchive` | Archive completed tasks |
| `Qcommit` | Human-style git commit (no AI traces) |
| `Mbump` | Bump plugin version (major/minor/patch) |
| `Qalias` | Define path/command shortcuts |
| `Qcc-setup` | Shell alias setup (cc, ccc, ccd) |
| `Qcommand-creator` | Create slash commands |
| `Mcreate-skill` | Create/edit/optimize/diagnose skills |
| `Mcreate-agent` | Create new background agents (E-prefix) |
| `Mtest-skill` | Test skill intent routing |
| `Qfind-skills` | Find/install skills from skills.sh |
| `Qmcp-setup` | MCP server setup guide |
| `Qmcp-builder` | Build MCP servers |
| `Qmemory` | Manage project memory (conventions, gotchas, decisions with TTL) |
| `Qprofile` | Analyze user patterns and style |
| `Qutopia` | Fully autonomous execution mode |
| `QCodexUpdate` | Check/update codex-plugin-cc plugin |
| `Qmistake` | Record mistakes to prevent repetition (.qe/MISTAKE.md) |
| `Qgc` | Code garbage collection (drift, violations, dead code) |
| `Mrefactor-agent-md` | Refactor bloated instruction files |
| `Mqe-audit` | Full framework quality audit and report |

### Task Execution
| Skill | Purpose |
|-------|---------|
| `Qgenerate-spec` | Generate CLAUDE.md + TASK_REQUEST + VERIFY_CHECKLIST |
| `Qrun-task` | Execute spec-based tasks |
| `Qcode-run-task` | Test > review > fix quality loop |
| `Qscenario-test` | Generate, execute, and verify E2E user scenarios (browser/API/CLI) |
| `Mmigrate-tasks` | Migrate task files to .qe/ structure |
| `Qautoresearch` | Autonomous experiment loop (modify > run > evaluate) |
| `Qtest-driven-development` | TDD: failing test first, then implement |
| `Qsystematic-debugging` | Hypothesis-driven root cause analysis |
| `Qrequirements-clarity` | Clarify ambiguous requirements before coding |

### Writing & Documentation
| Skill | Purpose |
|-------|---------|
| `Qwriting-clearly` | Improve prose clarity (Strunk's principles) |
| `Qhumanizer` | Remove AI-style writing patterns |
| `Qdoc-comment` | Add inline code documentation |
| `Qdoc-converter` | Convert between MD/DOCX/PDF/PPTX/HTML |
| `Qcontent-research-writer` | Research-driven article writing |
| `Qprofessional-communication` | Business email/message writing |
| `Qmermaid-diagrams` | Generate Mermaid diagrams |
| `Qc4-architecture` | C4 architecture diagrams |

### Data & Analysis
| Skill | Purpose |
|-------|---------|
| `Qdata-analysis` | Statistical analysis and visualization |
| `Qfinance-analyst` | Financial analysis and valuation |
| `Qxlsx` | Spreadsheet operations |
| `Qpdf` | PDF processing |
| `Qpptx` | Presentation creation/editing |
| `Qdocx` | Word document creation/editing |
| `Qimage-analyzer` | Analyze screenshots/diagrams/charts |
| `Qaudio-transcriber` | Audio to text conversion |
| `Qyoutube-transcript-api` | YouTube subtitle extraction |

### Product & Project Management
| Skill | Purpose |
|-------|---------|
| `Qpm-prd` | Write PRDs (P0/P1/P2 prioritization) |
| `Qpm-user-story` | User stories with INVEST + Gherkin criteria |
| `Qpm-roadmap` | Outcome-focused strategic roadmap planning |
| `Qpm-discovery` | Product discovery: OST, experiments, assumptions, interviews |
| `Qpm-strategy` | Strategic analysis: Lean Canvas, SWOT, PESTLE, Porter's |
| `Qpm-gtm` | Go-to-market: ICP, growth loops, battlecards, positioning |
| `Qpm-okr` | OKR brainstorming with SMART validation |
| `Qpm-retro` | Retrospectives, pre-mortem, release notes |
| `Qqa-test-planner` | Test plans and regression suites |
| `Qfeature-forge` | Requirements workshop > feature specs |
| `Qjira-cli` | Jira CLI for issue management |
| `Qstitch-cli` | Google Stitch MCP setup |
| `Qstitch-apply` | Convert Stitch HTML designs to React TSX components |
| `Qagentation` | Visual UI feedback tool setup |

### Academic
| Skill | Purpose |
|-------|---------|
| `Qgrad-paper-write` | Draft academic papers |
| `Qgrad-paper-review` | Respond to reviewer comments |
| `Qgrad-research-plan` | Literature review and experiment design |
| `Qgrad-seminar-prep` | Prepare presentations |
| `Qgrad-thesis-manage` | Thesis progress management |

### Code Quality & Security
| Skill | Purpose |
|-------|---------|
| `Qcode-reviewer` | Code diff review |
| `Qcode-documenter` | Generate API docs and guides |
| `Qdebugging-wizard` | Parse errors and trace execution |
| `Qsecurity-reviewer` | Security vulnerability scanning |
| `Qsecure-code-guardian` | Auth/OWASP implementation |
| `Qspringboot-security` | Spring Security best practices |
| `Qplaywright-expert` | E2E tests with Playwright |
| `Qtest-master` | Test file generation |
| `Qvitest` | Vitest unit testing |
| `Qspec-miner` | Reverse-engineer specs from legacy code |
| `Qthe-fool` | Critical reasoning / devil's advocate |
| `Qfact-checker` | Verify factual claims |
| `Qsource-verifier` | Source credibility verification (SIFT) |
| `Qlesson-learned` | Extract engineering lessons from git history |
| `Qi18n-audit` | Scan for hardcoded strings, generate translation keys, report i18n coverage |

### Design & Frontend
| Skill | Purpose |
|-------|---------|
| `Qfrontend-design` | Create new UI from scratch |
| `Qdesign-audit` | Audit design consistency within the project's own design system |
| `Qweb-design-guidelines` | Audit existing UI code |
| `Qweb-design-guidelines-vercel` | Vercel Web Interface Guidelines review |
| `Qdatabase-schema-designer` | Database schema design |
| `Qapi-designer` | REST/GraphQL API design |
| `Qarchitecture-designer` | System architecture design |
| `Qmicroservices-architect` | Distributed system architecture |
| `Qlegacy-modernizer` | Legacy system migration strategy |
| `Qagent-browser` | Browser automation CLI |
| `Qvisual-qa` | Chrome browser visual QA — screenshot compare against reference images |

### Language & Framework Experts
| Skill | Purpose |
|-------|---------|
| `Qpython-pro` | Python 3.11+ |
| `Qtypescript-pro` | TypeScript advanced |
| `Qjavascript-pro` | JavaScript ES2023+ |
| `Qgolang-pro` / `Qgolang` | Go |
| `Qrust-engineer` | Rust |
| `Qjava-architect` | Java / Spring Boot |
| `Qcsharp-developer` | C# / .NET 8 |
| `Qcpp-pro` | C++20/23 |
| `Qkotlin-specialist` | Kotlin |
| `Qphp-pro` | PHP 8.3+ |
| `Qswift-expert` | Swift / SwiftUI |
| `Qsql-pro` | SQL optimization |
| `Qreact-expert` | React 18+ |
| `Qvue-expert` / `Qvue-expert-js` | Vue 3 |
| `Qangular-architect` | Angular 17+ |
| `Qnextjs-developer` | Next.js 14+ |
| `Qreact-native-expert` | React Native / Expo |
| `Qflutter-expert` | Flutter 3+ |
| `Qfastapi-expert` | FastAPI |
| `Qdjango-expert` | Django |
| `Qnestjs-expert` | NestJS |
| `Qlaravel-specialist` | Laravel 10+ |
| `Qrails-expert` | Rails 7+ |
| `Qspring-boot-engineer` | Spring Boot 3.x |
| `Qdotnet-core-expert` | .NET 8 |
| `Qvite` | Vite |
| `Qreact-best-practices` | React/Next.js optimization |
| `Qvue-best-practices` | Vue.js best practices |

### Infrastructure & DevOps
| Skill | Purpose |
|-------|---------|
| `Qdevops-engineer` | Docker, CI/CD, K8s |
| `Qkubernetes-specialist` | Kubernetes workloads |
| `Qterraform-engineer` | Terraform IaC |
| `Qcloud-architect` | AWS/Azure/GCP |
| `Qpostgres-pro` | PostgreSQL optimization |
| `Qdatabase-optimizer` | DB query optimization |
| `Qmonitoring-expert` | Prometheus/Grafana |
| `Qsre-engineer` | SLOs, error budgets, incident response |
| `Qchaos-engineer` | Chaos experiments |
| `Qcli-developer` | CLI tool development |
| `Qwebsocket-engineer` | WebSocket systems |
| `Qsalesforce-developer` | Salesforce/Apex |
| `Qshopify-expert` | Shopify |
| `Qwordpress-pro` | WordPress |
| `Qatlassian-mcp` | Atlassian integration |
| `Qspark-engineer` | Spark jobs |
| `Qgraphql-architect` | GraphQL / Apollo |
| `Qprompt-engineer` | LLM prompt writing |
| `Qrag-architect` | RAG systems |
| `Qfine-tuning-expert` | LLM fine-tuning |
| `Qml-pipeline` | ML pipeline infrastructure |
| `Qpandas-pro` | Pandas DataFrame operations |
| `Qgame-developer` | Unity/Unreal game systems |
| `Qembedded-systems` | Firmware / RTOS |
| `Qmcp-developer` | Build/debug MCP servers |
| `Qfullstack-guardian` | Security-focused full-stack apps |

---

## Agents (E-prefix: background/sub-agents)

| Agent | Purpose |
|-------|---------|
| `Earchive-executor` | Archive tasks to .qe/.archive/ |
| `Ecode-debugger` | Bug root cause analysis |
| `Ecode-doc-writer` | Technical documentation writing |
| `Ecode-quality-supervisor` | Code quality audit (PASS/PARTIAL/FAIL) |
| `Ecode-reviewer` | Code review (quality/security/perf) |
| `Ecode-test-engineer` | Test writing and coverage |
| `Ecommit-executor` | Git commit operations (used by Qcommit) |
| `Ecompact-executor` | Context save/restore |
| `Edeep-researcher` | Multi-source research |
| `Edoc-generator` | Batch document generation |
| `Edocs-supervisor` | Documentation audit (PASS/PARTIAL/FAIL) |
| `Eanalysis-supervisor` | Analysis audit (PASS/PARTIAL/FAIL) |
| `Egrad-writer` | Academic paper chapter writing |
| `Ehandoff-executor` | Session handoff documents |
| `Epm-planner` | PRD/roadmap/story planning |
| `Eprofile-collector` | User behavior data collection |
| `Eqa-orchestrator` | Test > review > fix loop |
| `Erefresh-executor` | Project change detection |
| `Esecurity-officer` | Security vulnerability scanning |
| `Esupervision-orchestrator` | Expert-level quality assessment |
| `Etask-executor` | Complex task implementation (5+ items) |

---

## Skill File Size Rules

| Tier | Lines | When |
|------|-------|------|
| Minimal | <100 | Simple wrapper, single action |
| Standard | 100-200 | Most skills |
| Comprehensive | 200-250 | Complex multi-step workflows |

**Hard limit: 250 lines per SKILL.md.** If a skill exceeds 250 lines, extract verbose content (examples, reference docs) into a `references/` subdirectory.
