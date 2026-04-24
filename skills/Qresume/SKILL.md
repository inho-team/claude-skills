---
name: Qresume
description: Restores saved context after compaction or session break. Use when resuming work, restoring context, continuing from where you left off, or loading a previous session.
invocation_trigger: When framework initialization, maintenance, or audit is required.
recommendedModel: haiku
---


# Qresume — Context Restoration

## Role
A skill that restores context saved under `.qe/context/sessions/{sid}/` after compaction.
Loads the previous session's task state, decisions, and pending items to resume work seamlessly.

## Per-Session Layout (Auto-Named)
Snapshots are partitioned by Claude session id so each terminal sees its own context, not the latest sibling's. The 8-char `sid` is auto-derived by the SessionStart hook and surfaced as `[Session] sid:XXXXXXXX` in additionalContext — read it from there. There is no manual naming.

## How It Works

### Auto Load (Same Session)
Integrated with the pre-check in PRINCIPLES.md:
- When the skill is called immediately after compaction, Ecompact-executor checks whether `.qe/context/sessions/{sid}/snapshot.md` exists for the active sid
- If it exists, automatically loads the context and reflects it in the current session
- Notifies the user with a single line: "Previous context has been restored"

### Manual Execution
- `/Qresume` — restore the active sid's snapshot (default; what you want 95% of the time)
- `/Qresume --list` — list all session buckets newest-first (use when picking up another terminal's work). The list is built by `listSessionBuckets()` in `hooks/scripts/lib/session-resolver.mjs`. Pick a sid, then `/Qresume --from {sid}`
- `/Qresume --from {sid}` — restore a specific session bucket by its 8-char sid (or `_legacy` / `_unknown`)

## Restoration Procedure

### Step 1: Read Context Files
Load files from `.qe/context/sessions/{sid}/`:
- `snapshot.md` — last task state
- `decisions.md` — accumulated decisions
- `SNAPSHOT_SUMMARY.md` — semantic summary
- `compact-trigger.json` — pre-compact state (if present)

### Step 2: Restore State
- Check in-progress tasks (cross-reference with .qe/tasks/pending/)
- Check checklist progress
- Present list of pending items

### Step 3: Suggest Next Actions
Propose next actions based on restored context:
- If there are incomplete tasks → guide with `/Qrun-task {UUID}`
- If new work is needed → guide with `/Qgenerate-spec`
- If decisions need review → display decision list

## .qe/analysis/ Integration
When restoring context, also read `.qe/analysis/` files to understand the latest project state.
This allows starting work immediately without re-scanning the project with Glob/Grep, saving tokens.

## Will
- Load `.qe/context/sessions/{sid}/` context files for the active sid
- Support `--list` and `--from {sid}` for cross-terminal pickup
- Restore previous task state
- Suggest next actions
- Integrate with .qe/analysis/ to understand project state

## Will Not
- Error when context files are missing (silently ignore if not found)
- Cross-load another terminal's snapshot without explicit `--from`
- Blindly follow restored context (user can change direction)
- Force-apply stale context (notify "Context is stale" when 24+ hours have passed)
