# User Guide: Role-Separated QE Workflow

## What This Is

QE Framework lets you keep a simple command workflow while assigning different runners or model tiers to different roles.

Most users only need:

```text
/Qinit
/Qplan
/Qatomic-run
/Qcode-run-task
```

## Install

Install Claude CLI and the QE plugin:

```text
claude install
claude plugin marketplace add inho-team/qe-framework
claude plugin install qe-framework@inho-team-qe-framework
```

If GitHub SSH causes clone failures during plugin install, force HTTPS:

```text
git config --global url."https://github.com/".insteadOf git@github.com:
```

## Update

Update QE Framework using the path that matches your install:

```text
claude plugin update qe-framework@inho-team-qe-framework
```

Codex-first or npm-based installs:

```text
npm update -g @inho-team/qe-framework
```

Repository-local installs:

```text
node install.js
```

## Basic Usage

### 1. Initialize

Run:

```text
/Qinit
```

During initialization, QE can ask which AI should handle each role.

Typical roles:

- `planner` (creates the plan)
- `implementer` (does the implementation)
- `reviewer` (checks the result independently)
- `supervisor` (makes the final decision)

### 2. Plan

Run:

```text
/Qplan
```

This creates the project planning context and active execution path.

### 3. Execute

Run:

```text
/Qatomic-run
```

This performs the implementation step.

### 4. Verify

Run:

```text
/Qcode-run-task
```

This performs review, fix loops, and the final verification gate.

## Where Configuration Lives

Advanced users can inspect:

```text
.qe/ai-team/config/team-config.json
```

This file controls role-to-runner mapping, runner execution details, and tiered-model routing policies.

## Where Results Go

QE stores role artifacts in:

```text
.qe/ai-team/artifacts/
```

Key files:

- `role-spec.md`
- `task-bundle.json`
- `implementation-report.md`
- `review-report.md`
- `verification-report.md`

## Recommended Mental Model

You do not need to manage the internal orchestration directly.

Think of QE like this:

- `/Qinit` sets up who does what
- `/Qplan` prepares the work
- `/Qatomic-run` executes the work
- `/Qcode-run-task` checks whether the work is actually done

This can be done through:

- `hybrid` or `multi-model` for provider-level role separation
- `tiered-model` for one-provider high/medium/low model routing
