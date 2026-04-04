# QE Framework System Overview

QE Framework is a role-driven execution system for Claude Code and Codex. It keeps the user-facing workflow simple while allowing different AI systems to handle different roles behind the scenes.

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

## Core Roles

QE separates work via the **PSE Chain** (user workflow) and **SVS Loop** (quality gate):

**PSE Chain** — the 4-step user workflow:
- **Plan** (`/Qplan`): creates roadmap, phases, requirements
- **Spec** (`/Qgs`): generates TASK_REQUEST + VERIFY_CHECKLIST
- **Execute** (`/Qatomic-run`): implements via Haiku Wave execution
- **Verify** (`/Qcode-run-task`): test → review → fix quality loop

**SVS Loop** — the quality gate within Execute/Verify:
- **Spec**: TASK_REQUEST defines the contract
- **Verify**: VERIFY_CHECKLIST confirms completion
- **Supervise**: Supervision agents confirm quality

These map to underlying roles: planner, implementer, reviewer, supervisor. In `single-model` mode, one runner owns all roles. In `multi-model` or `tiered-model`, roles can be split across different runners.

These roles are not tied to a single AI vendor. A project can assign Claude, Gemini, Codex, or multiple instances of the same provider to different roles.

## Runner-Based Mapping

QE uses `role -> runner` mapping.

A `runner` is an execution definition for one role assignment. Each runner contains:

- provider
- model
- command
- timeout

This allows configurations such as:

- Claude for planning and final verification
- Codex for implementation
- Gemini for review
- or all four roles assigned to different Claude runners

## Artifacts

Role handoff is built around standard artifacts in `.qe/ai-team/artifacts/`:

- `role-spec.md`
- `task-bundle.json`
- `implementation-report.md`
- `review-report.md`
- `verification-report.md`

Ownership is explicit:

- planner owns `role-spec.md` and `task-bundle.json`
- implementer owns `implementation-report.md`
- reviewer owns `review-report.md`
- supervisor owns `verification-report.md`

## Configuration

The main configuration file is:

```text
.qe/ai-team/config/team-config.json
```

It defines:

- which runner each role uses
- how each runner executes
- workflow policy and quality gate behavior

## Runtime

The orchestration runtime is implemented with:

- `scripts/validate_ai_team_config.mjs`
- `scripts/run_role.mjs`
- `scripts/run_team_workflow.mjs`

These scripts support:

- config validation
- single-role execution
- full workflow execution
- workflow-local artifact snapshots
- resume and reuse modes
- artifact normalization

## Installation Model

QE Framework is installed as:

- a Claude plugin target for Claude Code
- a Codex skill/agent target for Codex
- external CLI runners when Codex or Gemini are assigned to workflow roles

Typical install flow:

```text
claude install
claude plugin marketplace add inho-team/qe-framework
claude plugin install qe-framework@inho-team-qe-framework
```

## Current Architecture Goal

The public interface stays simple, but internally QE supports structured multi-AI collaboration with explicit responsibility boundaries, repeatable artifacts, and verification gates.
