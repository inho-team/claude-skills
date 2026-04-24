---
name: Qsweep
description: Auto-cleans the .qe/ folder based on status signals (checkbox completion, filename dates, path dates). Moves completed tasks/checklists to .archive/, purges volatile agent-results. Use for /Qsweep, .qe cleanup, folder tidy, archive stale, clean up .qe, archive completed tasks, stale pending cleanup. Distinct from Qarchive (which only handles checkbox-complete pending tasks) — this skill covers all .qe/ subfolders with retention-aware policies.
invocation_trigger: When the .qe/ directory accumulates stale or completed artifacts, or when the user runs /Qsweep.
recommendedModel: haiku
---


# Qsweep — .qe Folder Auto-Cleanup

## Role
Sweeps the `.qe/` directory using **status-based signals** (not just mtime), moving confirmed-complete artifacts into `.qe/.archive/vX.Y.Z/` and purging volatile cache folders. Complements Qarchive by covering folders Qarchive does not touch (completed/, handoffs, security-reports, learning/failures, agent-results).

## When to use
- `.qe/tasks/completed/` or `checklists/completed/` has accumulated
- Old `handoffs/HANDOFF_*.md` or `security-reports/SECURITY_REPORT_*.md` clutter the tree
- `learning/failures/YYYY-MM/` has folders from prior months
- `agent-results/` has stale per-run output files
- SessionStart hook surfaces `[QE Sweep] .qe cleanup available: N to archive, ...`

## How it works

### Signal priority (not mtime-first)
| Folder | Primary signal | Retention |
|---|---|---|
| `tasks/completed`, `checklists/completed` | folder-name = already completed | archive immediately |
| `tasks/pending` + matching `checklists/pending` all-checked | checkbox state (`isAllComplete`) | archive the pair |
| `tasks/pending` unfinished & old mtime | mtime > 30d | **report only** (never auto-move) |
| `handoffs/HANDOFF_YYYYMMDD_*` | filename date | archive if > 30d |
| `security-reports/SECURITY_REPORT_YYYYMMDD_*` | filename date | archive if > 14d |
| `learning/failures/YYYY-MM/` | path-embedded month | archive whole month if > 30d |
| `agent-results/` | mtime (volatile) | **delete** if > 7d |

### Folders never touched
`state/`, `planning/`, `contracts/`, `context/`, `profile/`, `ai-team/` — these hold active session/project state.

### Automation
- **SessionStart hook**: runs analyzer (read-only), injects one-line summary if anything is pending:
  `[QE Sweep] .qe cleanup available: 20 to archive, 3 stale pending.`
- **Stop hook**: auto-applies archive moves and volatile purges (default). Announces via `systemMessage`:
  `[QE Sweep] archived 20 → .qe/.archive/v0.2.0, purged 3 volatile`
- **Manual**: `/Qsweep` shows detailed plan; `/Qsweep --apply` forces execution (useful mid-session).

### Opt-out
Auto-apply can be disabled by setting `sweep_auto: false` in `.qe/config.json`:
```json
{ "hooks": { "sweep_auto": false } }
```
With auto off, only volatile (agent-results) purge runs on Stop; archive moves become opt-in via `/Qsweep --apply`.

## Invocation

### `/Qsweep` — dry-run report
Shows:
- Archive plan grouped by category
- Stale pending report (age in days)
- Volatile purge list
- Suggested next archive version (`v0.2.0` etc.)

### `/Qsweep --apply` — execute
- Moves archive items to `.qe/.archive/vX.Y.Z/<category>/`
- Deletes volatile items
- Prints resulting summary (moved/deleted/errors)

### Example (current state)
```
$ /Qsweep
[QE Sweep] Plan for v0.2.0:
  tasks/completed       → archive  (10 files)
  checklists/completed  → archive  (10 files)
  stale pending         → report   (0 files)
  volatile              → delete   (0 files)
Run /Qsweep --apply to execute.
```

## Safety rules
- Archive moves go to `.qe/.archive/<version>/<category>/` — **recoverable with `mv`**, never deleted
- Only `agent-results/` is subject to deletion (volatile by design)
- Unfinished pending tasks are **reported, never moved** (even in auto mode)
- Auto-apply uses deterministic signals only (folder name, checkbox count, embedded date)
- Fault-tolerant: hook failure never blocks session start or stop
- Every auto-apply announces what moved via `systemMessage` — no silent file movement

## Related skills
- **Qarchive** — archives checkbox-complete pending tasks only; kept for backward compat and auto-trigger from Qrun-task
- **Qgc** — code-level garbage collection (doc-code drift, dead code); separate concern
- **Qrefresh** — refreshes `.qe/analysis/`; not a cleanup tool

## Implementation
- `hooks/scripts/lib/sweep-analyzer.mjs` — scans folders, builds plan (pure)
- `hooks/scripts/lib/sweep-executor.mjs` — applies plan (apply or dry-run)
- Wired into `session-start.mjs` (summary) and `stop-handler.mjs` (volatile purge)

## Will
- Scan `.qe/` by status/filename/path signals
- Move confirmed-complete artifacts to versioned archive
- Purge stale volatile folders

## Will Not
- Delete unfinished tasks
- Touch active folders (state, planning, contracts, context, profile, ai-team)
- Move files without announcing what moved
- Use mtime as primary signal (only for volatiles)
