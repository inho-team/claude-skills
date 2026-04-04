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

## Will
- Orchestrate parallel execution via Agent Teams
- Monitor Haiku teammate performance
- Synthesize results and handle merges

## Handoff
After all Wave items are complete, display the execution summary, then branch by task type.

### Execution Summary (always show)
```
## 실행 완료 — {TaskName}

| 항목 | 값 |
|------|---|
| Task Type | {code / docs / analysis} |
| Wave 수 | {N} |
| 완료 항목 | {X}/{Y} |
| Teammate 수 | {Z} |
```

### When `type: code`
```
PSE Chain:  ✅ /Qplan  →  ✅ /Qgs  →  ✅ /Qatomic-run  →  👉 /Qcode-run-task
```
```
다음 명령어:

  /Qcode-run-task
```

### When `type: docs` / `type: analysis` / deletion-heavy
SVS 검증을 인라인으로 수행한 뒤(VERIFY_CHECKLIST 확인 + 감독 게이트):
```
PSE Chain:  ✅ /Qplan  →  ✅ /Qgs  →  ✅ /Qatomic-run  →  ✅ 완료
```
다음 Phase가 있으면:
```
다음 명령어:

  /Qgs Phase {X+1}: {PhaseName}

  안 되면: /Qgenerate-spec Phase {X+1}: {PhaseName}
```
다음 Phase가 없으면 완료 보고로 종료.

## Will Not
- Implement complex architectural changes (handle via standard **Etask-executor**)
- Bypass the quality loop
- Skip the handoff
