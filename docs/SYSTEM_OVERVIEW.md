# QE Framework System Overview

QE Framework is a SVS (Spec-Verify-Supervise) loop system for Claude Code. It provides a complete AI-driven workflow using Claude as the default provider, with optional Codex support via the `codex-plugin-cc` bridge.

## User Workflow

Most users only need these commands:

```text
/Qinit
/Qplan
/Qatomic-run
/Qcode-run-task
```

- `/Qinit`: initialize the project and choose how AI roles should be assigned
- `/Qplan`: create the project plan and active execution context
- `/Qatomic-run`: execute implementation work
- `/Qcode-run-task`: run review and final verification

## SVS Loop Architecture

QE separates work via the **PSE Chain** (user workflow) and **SVS Loop** (execution model):

**PSE Chain** — the user-facing workflow:
- **Plan** (`/Qplan`): creates roadmap, phases, requirements
- **Spec** (`/Qgs`): generates TASK_REQUEST + VERIFY_CHECKLIST
- **Execute** (`/Qatomic-run`): implements via Wave execution
- **Verify** (`/Qcode-run-task`): runs verification and quality loop

**SVS Loop** — the execution engine with 3 stages:
- **Spec** (S): TASK_REQUEST generation defines the contract
- **Verify** (V): Implementation validation and test cycles
- **Supervise** (S): Quality gates and final review

Each SVS stage can be routed to Claude (default) or Codex (via codex-plugin-cc). The routing is configured in `.qe/svs-config.json`.

## Provider Routing

QE Framework defaults to Claude for all stages but supports optional Codex routing via `codex-plugin-cc`.

**Default (Claude-only)**:
- Spec, Verify, and Supervise stages all use Claude
- No external dependencies required
- Complete functionality without installation

**Optional Codex Bridge**:
- Install `codex-plugin-cc` for Codex integration
- Route individual SVS stages to Codex via `svs-config.json`
- Bridge logic in `scripts/lib/codex_bridge.mjs`

## Artifacts

SVS stages exchange standard artifacts in `.qe/artifacts/`:

- `TASK_REQUEST.md`: Spec stage output; defines implementation contract
- `VERIFY_CHECKLIST.md`: Verify stage input/output; tracks completion and quality gates
- `IMPLEMENTATION_REPORT.md`: Verify stage report; documents results and issues
- `SUPERVISION_REPORT.md`: Supervise stage report; final quality assurance

Ownership is explicit by stage:

- Spec owns TASK_REQUEST
- Verify owns VERIFY_CHECKLIST and IMPLEMENTATION_REPORT
- Supervise owns SUPERVISION_REPORT

## Configuration

The main configuration file is:

```text
.qe/svs-config.json
```

It defines:

- which provider (Claude or Codex) each SVS stage uses
- provider options (model, temperature, timeout)
- quality gate policies and verification rules

## Runtime

The SVS execution engine is implemented with:

- `scripts/lib/svs-engine.mjs`: Core SVS loop orchestration
- `scripts/lib/codex_bridge.mjs`: Optional Codex provider bridge (requires codex-plugin-cc)
- `scripts/validate_svs_config.mjs`: SVS configuration validation

The engine supports:

- Spec stage: generating TASK_REQUEST from requirements
- Verify stage: executing implementation and validation
- Supervise stage: quality gates and approval
- Provider routing: Claude (default) or Codex (if available)
- Resume and checkpoint modes
- Artifact versioning and history

## Installation Model

QE Framework is distributed as a Claude Code plugin:

**Minimal Install** (Claude-only, no external dependencies):
```text
claude install
claude plugin marketplace add inho-team/qe-framework
claude plugin install qe-framework@inho-team-qe-framework
```

**With Codex Support** (optional, requires codex-plugin-cc):
```text
npm install --save-dev codex-plugin-cc
# svs-config.json can then route stages to codex-plugin-cc
```

QE Framework works completely without Codex; the plugin is optional for teams that want to use Codex for specific SVS stages.

## v4.0 Architecture

QE v4.0 focuses on **Claude-first simplicity with optional Codex extensibility**:

- **Single-provider baseline**: Claude handles all SVS stages by default
- **Zero external dependencies**: Works without Codex, Gemini, or other external APIs
- **Optional bridge**: `codex-plugin-cc` enables Codex routing for teams that want it
- **Simplified routing**: 3 SVS stages (Spec, Verify, Supervise) vs. 4+ legacy roles
- **Explicit configuration**: All provider choices in `svs-config.json`, no hidden fallbacks

This approach reduces complexity while keeping extensibility for future multi-provider scenarios.
