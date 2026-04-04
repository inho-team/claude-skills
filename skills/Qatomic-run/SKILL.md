---
name: Qatomic-run
description: "Parallel execution engine using Haiku Wave. Best for TASK_REQUESTs with many simple, atomic checklist items. Triggers multiple Haiku teammates to execute independent items concurrently."
invocation_trigger: "When a TASK_REQUEST contains many atomic items that can be executed in parallel by low-reasoning agents."
recommendedModel: sonnet
---

# Qatomic-run — Haiku Wave Execution Engine

## Role
A coordination skill that orchestrates multiple **Haiku Teammates** to execute atomic checklist items in parallel. It acts as the "Lead" session that partitions work and merges results.

## Workflow

### Step 1: Atomic Partitioning
Read the `TASK_REQUEST` and identify items suitable for parallel execution:
- No inter-dependencies (or dependencies are already met).
- Low complexity (single file edits, text changes, simple logic).
- Non-overlapping file ownership.

### Step 2: Wave Initiation
Create an **Agent Team** using the `Agent` tool:
- Assign **one Haiku Teammate per atomic item**.
- **Atomic Commits**: Teammates MUST perform a `git commit` immediately after completing their specific item.
- **Technical Summary**: Teammates MUST create a `.qe/planning/phases/{X}/SUMMARY_{Item#}.md` describing precisely what changed and any side-effects.
- Set teammates to `haiku` model for maximum speed and efficiency.

### Step 3: Result Synthesis
As Haiku teammates complete their tasks:
- Lead session (Opus/Sonnet) reads all `SUMMARY_*.md` files.
- Synthesize changes without re-reading entire files unless a merge conflict occurs.
- Aggregate all changes into the main working branch.

### Step 4: Post-Execution Gate
After all atomic items are done, determine the next step based on task type:
- **`type: code`** → trigger `/Qcode-run-task` for test → review → fix quality loop.
- **`type: docs` / `type: analysis` / deletion-heavy tasks** → run SVS Loop verification (VERIFY_CHECKLIST check + supervision) directly, skip `/Qcode-run-task`.

## Execution Rules
- **Wave**: Group independent items from `TASK_REQUEST` into execution waves. Wave N+1 starts only after Wave N is verified.
- **File Ownership**: No two teammates can modify the same file within the same wave. Lead (Sonnet) must partition files before spawning.
- **Haiku-First**: Always use `haiku` for teammates. If an item requires Sonnet, it's not "Atomic" and should be handled by standard `/Qrt`.
- **Context Integrity**: Use `ContextMemo` to ensure teammates have current state without redundant I/O.

## SVS Engine Routing

Before spawning Haiku teammates, check SVS engine configuration:

1. Read `.qe/svs-config.json` from the project root (via `scripts/lib/codex_bridge.mjs` → `loadSvsConfig()`).
2. Check `verify.engine` value:
   - **`"claude"` (default)**: Proceed with the standard Haiku swarm execution. No changes.
   - **`"codex"`**: Delegate implementation to Codex via codex-plugin-cc instead of Haiku swarm:
     1. Call `resolveEngine("verify", config)` to check availability.
     2. If available: invoke `/codex:rescue` with the full TASK_REQUEST checklist as a single task. Codex handles all items internally (no wave splitting needed).
     3. If NOT available: show warning and fallback to standard Haiku swarm execution.
3. Check for legacy config: call `detectLegacyConfig()`. If non-null, display migration warning.

**Note**: When using Codex engine, wave-based parallelism is not used — Codex handles task partitioning internally. The quality loop (`/Qcode-run-task`) still runs after Codex completes.

**Fallback guarantee**: Missing `.qe/svs-config.json` → all stages default to Claude. Zero impact on existing workflows.

## Will
- Orchestrate parallel execution via Agent Teams
- Monitor Haiku teammate performance
- Synthesize results and handle merges

## Handoff
After all Wave items are complete, read `.qe/planning/ROADMAP.md` to build the Roadmap progress line, then display execution summary and branch by task type.

### Roadmap Progress Line
Read all Phases from ROADMAP.md. Mark completed phases `✅`, current/next `👉`, remaining `○`:
```
Roadmap:  ✅ Phase 1  →  👉 Phase 2  →  ○ Phase 3
          {Name1}        {Name2}        {Name3}
```

### Execution Summary (always show)
```
## Execution Complete — {TaskName}

| Item | Value |
|------|-------|
| Task Type | {code / docs / analysis} |
| Waves | {N} |
| Completed Items | {X}/{Y} |
| Teammates | {Z} |
```

### When `type: code`
```
[Phase {X}: {PhaseName}] Implementation complete — moving to verification

Roadmap:  {phase progress line}
PSE Chain:  ✅ /Qplan  →  ✅ /Qgs  →  ✅ /Qatomic-run  →  👉 /Qcode-run-task
```
```
Next command:

  /Qcode-run-task {UUID}
```

### When `type: docs` / `type: analysis` / deletion-heavy
After performing SVS verification inline (VERIFY_CHECKLIST check + supervision gate):
```
[Phase {X}: {PhaseName}] Complete

Roadmap:  {phase progress line}
PSE Chain:  ✅ /Qplan  →  ✅ /Qgs  →  ✅ /Qatomic-run  →  ✅ Complete
```
If next Phase exists:
```
Next command:

  /Qgs Phase {X+1}: {NextPhaseName}

  Otherwise: /Qgenerate-spec Phase {X+1}: {NextPhaseName}
```
When all Phases are complete:
```
🎉 Roadmap complete. Use /Qcommit for final commit.
```

## Will Not
- Implement complex architectural changes (handle via standard **Etask-executor**)
- Bypass the quality loop
- Skip the handoff
