# PR Summary: Multi-Model Role Orchestration

## Summary

This change adds runner-based multi-model orchestration to QE Framework.

The main design shift is:

- from `role -> provider`
- to `role -> runner`

That change makes it possible to assign different AI systems, or multiple instances of the same AI system, to different responsibilities such as planning, implementation, review, and final verification.

## What Changed

### Role Orchestration

- added explicit `planner`, `implementer`, `reviewer`, and `supervisor` role handling
- introduced runner-based role assignment
- enabled repeated use of the same provider under different runner names

### Runtime

- added config validation
- added single-role runner execution
- added end-to-end workflow orchestration
- added workflow-local artifact snapshots
- added resume and artifact-clearing options

### Artifacts

QE now standardizes role handoff through:

- `role-spec.md`
- `task-bundle.json`
- `implementation-report.md`
- `review-report.md`
- `verification-report.md`

### `/Qinit` UX

`/Qinit` was updated to explain technical terms more clearly and guide users toward role-based AI assignment instead of exposing low-level runtime concepts too early.

### Plugin Delivery

The framework now works through a dual-target installation flow: Claude plugin delivery for Claude Code plus Codex skill/agent installation for Codex, while still using external AI CLIs for role runners.

## Why It Matters

- avoids one model planning, implementing, and self-validating its own work
- makes role boundaries explicit
- reduces spec drift
- improves independent review
- allows provider flexibility without changing QE workflow

## Validation

Validation covered:

- config validation
- runner-based workflow dry-runs
- provider CLI invocation
- Claude/Codex installation and update path
- end-to-end workflow execution with role artifacts
