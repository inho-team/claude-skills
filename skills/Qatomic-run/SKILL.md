---
name: Qatomic-run
description: "Parallel execution engine using Haiku Swarm. Best for TASK_REQUESTs with many simple, atomic checklist items. Triggers multiple Haiku teammates to execute independent items concurrently."
invocation_trigger: "When a TASK_REQUEST contains many atomic items that can be executed in parallel by low-reasoning agents."
recommendedModel: sonnet
---

# Qatomic-run — Haiku Swarm Execution Engine

## Role
A coordination skill that orchestrates multiple **Haiku Teammates** to execute atomic checklist items in parallel. It acts as the "Lead" session that partitions work and merges results.

## Workflow

### Step 1: Atomic Partitioning
Read the `TASK_REQUEST` and identify items suitable for parallel execution:
- No inter-dependencies (or dependencies are already met).
- Low complexity (single file edits, text changes, simple logic).
- Non-overlapping file ownership.

### Step 2: Swarm Initiation
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

### Step 4: Quality Loop
After all atomic items are done, automatically trigger `/Qcode-run-task` to ensure the combined implementation is architecturally sound.

## Execution Rules
- **Wave Model**: Group independent items from `TASK_REQUEST` into execution waves. Wave N+1 starts only after Wave N is verified.
- **File Ownership**: No two teammates can modify the same file within the same wave. Lead (Sonnet) must partition files before spawning.
- **Haiku-First**: Always use `haiku` for teammates. If an item requires Sonnet, it's not "Atomic" and should be handled by standard `/Qrt`.
- **Context Integrity**: Use `ContextMemo` to ensure teammates have current state without redundant I/O.

## Multi-Model Role Mode

If `.qe/ai-team/config/team-config.json` exists and `mode` is `multi-model` or `hybrid`, `/Qatomic-run` is the default implementer stage in the `Qplan` chain.

Implementer invariants in that mode:
- **Read-only spec**: Consume `.qe/ai-team/artifacts/role-spec.md` + `task-bundle.json` and the TASK_REQUEST pair, but never rewrite planner-owned documents unless the planner explicitly requests changes.
- **Scope enforcement**: Partition work strictly within the files/modules enumerated in the bundle. If an item would exceed scope, pause and request planner approval rather than editing.
- **Implementation report output**: After synthesis, append to `.qe/ai-team/artifacts/implementation-report.md` with a markdown block containing:
  - Changed files (absolute or repo-relative list)
  - Commands / checks executed (tests, linters, scripts)
  - Unresolved risks or follow-ups
  - Date/time stamp + implementer identity
- **No silent spec rewrites**: Any requirement shifts must bounce back to planner; otherwise proceed with tactical decisions only.

These guardrails are skipped entirely when `mode` is `single-model` to preserve existing behavior.

## Will
- Orchestrate parallel execution via Agent Teams
- Monitor Haiku teammate performance
- Synthesize results and handle merges

## Mandatory Handoff Message
After all atomic items are complete, you MUST display this EXACTLY:

```
---
## PSE 다음 단계

실행이 완료되었습니다. 검증을 위해 다음 명령을 실행하세요:

  /Qcode-run-task

PSE 체인: ✅ /Qplan → ✅ /Qgs → ✅ /Qatomic-run → 👉 /Qcode-run-task
---
```

## Will Not
- Implement complex architectural changes (handle via standard **Etask-executor**)
- Bypass the quality loop
- Skip the handoff message
