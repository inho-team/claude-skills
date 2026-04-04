# QE Framework System Overview

QE Framework is a SIVS (Spec-Implement-Verify-Supervise) loop system for Claude Code. It provides a complete AI-driven workflow using Claude as the default provider, with optional Codex support via the `codex-plugin-cc` bridge.

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

## SIVS Loop Architecture

QE separates work via the **PSE Chain** (user workflow) and **SIVS Loop** (execution model):

**PSE Chain** — the user-facing workflow:
- **Plan** (`/Qplan`): creates roadmap, phases, requirements
- **Spec** (`/Qgs`): generates TASK_REQUEST + VERIFY_CHECKLIST
- **Execute** (`/Qatomic-run`): implements via Wave execution
- **Verify** (`/Qcode-run-task`): runs verification and quality loop

**SIVS Loop** — the execution engine with 4 stages:
- **Spec** (S): TASK_REQUEST generation defines the contract
- **Implement** (I): Actual coding and file modifications
- **Verify** (V): Validation against VERIFY_CHECKLIST (no coding — pure confirmation)
- **Supervise** (S): Quality gates and final review

Each SIVS stage can be routed to Claude (default) or Codex (via codex-plugin-cc). The routing is configured in `.qe/sivs-config.json`.

## Provider Routing

QE Framework defaults to Claude for all stages but supports optional Codex routing via `codex-plugin-cc`.

**Default (Claude-only)**:
- Spec, Implement, Verify, and Supervise stages all use Claude
- No external dependencies required
- Complete functionality without installation

**Optional Codex Bridge**:
- Install `codex-plugin-cc` for Codex integration
- Route individual SIVS stages to Codex via `sivs-config.json`
- Bridge logic in `scripts/lib/codex_bridge.mjs`

## Artifacts

SIVS stages exchange standard artifacts in `.qe/artifacts/`:

- `TASK_REQUEST.md`: Spec stage output; defines implementation contract
- `VERIFY_CHECKLIST.md`: Verify stage input/output; tracks completion and quality gates
- `IMPLEMENTATION_REPORT.md`: Implement stage report; documents results and issues
- `SUPERVISION_REPORT.md`: Supervise stage report; final quality assurance

Ownership is explicit by stage:

- Spec owns TASK_REQUEST
- Implement owns code changes and IMPLEMENTATION_REPORT
- Verify owns VERIFY_CHECKLIST validation
- Supervise owns SUPERVISION_REPORT

## Configuration

The main configuration file is:

```text
.qe/sivs-config.json
```

It defines:

- which provider (Claude or Codex) each SIVS stage uses
- provider options (model, temperature, timeout)
- quality gate policies and verification rules

## Runtime

The SIVS execution engine is implemented with:

- `scripts/lib/svs-engine.mjs`: Core SIVS loop orchestration
- `scripts/lib/codex_bridge.mjs`: Optional Codex provider bridge (requires codex-plugin-cc)
- `scripts/validate_svs_config.mjs`: SIVS configuration validation

The engine supports:

- Spec stage: generating TASK_REQUEST from requirements
- Implement stage: executing code changes based on TASK_REQUEST
- Verify stage: validating implementation against VERIFY_CHECKLIST
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
# sivs-config.json can then route stages to codex-plugin-cc
```

QE Framework works completely without Codex; the plugin is optional for teams that want to use Codex for specific SIVS stages.

## v5.x Architecture

QE v5.x focuses on **Claude-first simplicity with optional Codex extensibility**:

- **Single-provider baseline**: Claude handles all SIVS stages by default
- **Zero external dependencies**: Works without Codex, Gemini, or other external APIs
- **Optional bridge**: `codex-plugin-cc` enables Codex routing for teams that want it
- **Clear separation of concerns**: 4 SIVS stages (Spec, Implement, Verify, Supervise) — each with a single responsibility
- **Explicit configuration**: All provider choices in `sivs-config.json`, no hidden fallbacks

This approach reduces complexity while keeping extensibility for future multi-provider scenarios.
