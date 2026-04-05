---
name: Qgc
description: Code Garbage Collection — scans for doc-code drift, rule violations, and dead code. Use when cleaning up codebase, checking quality debt, or before major releases.
invocation_trigger: When the user wants to clean up code, check for stale code, audit quality, or says "garbage collection", "cleanup", "dead code", "drift".
recommendedModel: sonnet
---

# Qgc — Code Garbage Collection

## Role
Scans the codebase for quality debt and produces a GC report. Fixes simple issues automatically and generates TASK_REQUESTs for complex ones.

## Subcommands

| Command | Scope |
|---------|-------|
| `/Qgc` | Full scan (all 3 categories) |
| `/Qgc drift` | Doc-Code Drift only |
| `/Qgc lint` | Rule Violations only |
| `/Qgc dead` | Dead Code only |
| `/Qgc fix` | Auto-fix all fixable issues from last report |

## Workflow

### Step 1: Analyze
Run gc-analyzer from `hooks/scripts/lib/gc-analyzer.mjs`:
1. **Doc-Code Drift**: Compare CLAUDE.md/README vs actual deps/structure
2. **Rule Violations**: Run comment-checker + lint detection on recent files
3. **Dead Code**: Find 90-day untouched files + orphan files (no imports)

### Step 2: Report
Generate `.qe/gc/GC_REPORT.md` with findings:

```
# GC Report — {date}

## Summary
| Category | Found | Auto-fixable | Needs Manual |
|----------|-------|-------------|-------------|
| Doc-Code Drift | N | M | K |
| Rule Violations | N | M | K |
| Dead Code | N | 0 | K |

## Details
### Doc-Code Drift
- [severity] description

### Rule Violations  
- [severity] file:line — rule — description

### Dead Code
- [severity] file — reason — last modified
```

Log execution to `.qe/gc/gc-history.jsonl`:
```json
{"date":"2026-04-05","mode":"full","found":12,"fixed":5,"manual":7,"duration":3200}
```

### Step 3: Fix (if /Qgc fix or auto-fix enabled)
- **Auto-fixable**: lint --fix, unused import removal, stale analysis → /Qrefresh hint
- **Manual required**: Generate TASK_REQUEST with grouped issues → suggest /Qrun-task
- Use `AskUserQuestion` before applying fixes: "Found N auto-fixable issues. Apply fixes?"

### Step 4: Summary
Display GC results to user:
```
GC Complete: {date}
  Scanned: {N} files
  Found: {M} issues (drift: X, violations: Y, dead: Z)
  Auto-fixed: {K}
  Manual tasks: {L} (see .qe/gc/GC_REPORT.md)
```

## Session Integration
session-start hook checks `.qe/gc/gc-history.jsonl`:
- Last run > 7 days ago → "[GC] Last garbage collection was N days ago. Run /Qgc to scan."
- No history → "[GC] No garbage collection has been run. Consider /Qgc."

## Will
- Scan for doc-code drift, rule violations, dead code
- Generate structured report
- Auto-fix simple issues with confirmation
- Generate TASK_REQUESTs for complex issues

## Will Not
- Run builds or modify project configuration
- Delete files without user confirmation
- Auto-fix complex architectural issues
