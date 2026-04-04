---
name: Qrun-task
description: Executes spec-based tasks from TASK_REQUEST and VERIFY_CHECKLIST documents. Use when running a task, implementing a spec, or executing a checklist.
invocation_trigger: When a TASK_REQUEST or checklist needs implementation or verification.
recommendedModel: haiku
---

# Task Execution Skill (PSE Chain Fallback)

## Role
Execute tasks based on spec documents. This is a **secondary execution engine** within the `/Qplan` PSE Chain, used when tasks cannot be fully atomized for `/Qatomic-run`.

> **MANDATORY:** All user confirmations MUST use the `AskUserQuestion` tool. Do NOT output options as plain text — always call the tool.

## Relationship to the Primary Chain
- Canonical path: `/Qplan -> /Qgs -> /Qatomic-run -> /Qcode-run-task`.
- Prefer `/Qatomic-run` whenever the checklist can be partitioned; use `/Qrun-task` when tasks are non-atomic, long-form, or explicitly routed for remediation.
- Even in fallback mode, still hand off to `/Qcode-run-task` to maintain the verification and supervision gate.

## Workflow
```
/Qgenerate-spec → /Qrun-task → Read → Summarize → Approve → Execute → Verify → ✅ Done
```

## Directory Structure
```
.qe/tasks/{pending,in-progress,completed,on-hold}/TASK_REQUEST_*.md
.qe/checklists/{pending,in-progress,completed,on-hold}/VERIFY_CHECKLIST_*.md
.qe/tasks/remediation/REMEDIATION_REQUEST_*.md
```

## SIVS Engine Routing

Before executing task items, check SIVS engine configuration:

1. Read `.qe/sivs-config.json` from the project root (via `scripts/lib/codex_bridge.mjs` → `loadSivsConfig()`).
2. Check `implement.engine` value for the **Implement** stage (actual coding):
   - **`"claude"` (default)**: Proceed with the standard execution workflow. No changes.
   - **`"codex"`**: Delegate implementation to Codex via codex-plugin-cc:
     1. Call `resolveEngine("implement", config)` to check availability.
     2. If available: invoke `/codex:rescue` with `--write` flag, passing the TASK_REQUEST checklist items as the task description. Codex will modify files directly.
     3. If NOT available: show warning and fallback to Claude execution.
3. Check `verify.engine` value for the **Verify** stage (validation only):
   - **`"claude"` (default)**: Claude validates implementation results against VERIFY_CHECKLIST.
   - **`"codex"`**: Codex validates via `/codex:rescue --verify`.
4. Check for legacy config: call `detectLegacyConfig()`. If non-null, display migration warning.

**Codex Implement Delegation:**
- Use `codex:codex-rescue` subagent (via Agent tool) for autonomous execution
- Pass TASK_REQUEST content as the task prompt
- Codex operates in `--write` mode (can modify files)
- After Codex completes, proceed to the Verify stage (validation only)

**Fallback guarantee**: Missing `.qe/sivs-config.json` → all stages default to Claude. Zero impact on existing workflows.

## Delegation Rule
When checklist has **5+ items**, delegate to `Etask-executor` agent. Main agent tracks progress, state transitions, and verification. After delegation, update timestamps: `- [x] item ✅ (HH:MM)`.

**Model selection when spawning Etask-executor:**

Read the TASK_REQUEST checklist for `<!-- complexity: ... -->` tags, then pick the model:

| Condition | Model |
|-----------|-------|
| Any item tagged `complexity: high` | `sonnet` |
| All items tagged `complexity: low` | `haiku` |
| No tags, ≤ 3 items, single-file scope | `haiku` |
| No tags, 4–7 items | `sonnet` |
| No tags, 8+ items OR cross-cutting architecture | `sonnet` |

Pass the selected model as the `model` parameter when spawning `Etask-executor`.

---
## Step 1: Document Discovery

1. **Use State Utility**: Call `parseClaudeTaskTable(cwd)` from `hooks/scripts/lib/state.mjs`. It now prefers `.qe/TASK_LOG.md` and falls back to the legacy `CLAUDE.md` task table.
2. Glob `.qe/tasks/{pending,in-progress,on-hold}/*.md` for TASK_REQUEST files
3. Backward compat: check project root if `.qe/tasks/` missing
4. Multiple tasks → ask which to run. UUID argument → select directly
5. Multiple UUIDs (space-separated) → parallel execution (see **Multiple UUID Execution** section below)

## Step 2: Summary and Approval

Read TASK_REQUEST + VERIFY_CHECKLIST, show summary:
... (omitted summary table) ...

**Chained execution skip:** If TASK_REQUEST contains `<!-- chained-from: Qgenerate-spec -->`, skip the approval prompt (user already approved in Qgenerate-spec). Remove the comment after reading.

Otherwise, use `AskUserQuestion` for approval. On approve:
- Move files to `in-progress/`
- **Update Status**: Call `updateClaudeStatus(cwd, uuid, "🔶")`. This updates the active task registry, preferring `.qe/TASK_LOG.md`.

## Step 3: Execute

Execute checklist items in order. Report: `✅ [1/N] desc - done`. Record `- [x] item ✅ (HH:MM)`.

**Code task**: After Step 3, ask whether to run `/Qcode-run-task` quality loop.

**Intermediate verification**: Every 3 items (or per `<!-- verify-interval: N -->`), check relevant VERIFY_CHECKLIST items. Fix failures before continuing.

## Step 4: Final Verification

Verify **each** VERIFY_CHECKLIST item with a concrete action — "build passed" alone is NOT sufficient.

| Item type | Verification action |
|-----------|-------------------|
| File exists | `Glob` for the path |
| Code behavior | `Grep` for expected pattern or run test |
| Build/compile | `tsc --noEmit` or project build command |
| No regression | Run existing test suite |
| Security | Invoke `Esecurity-officer` (see below) |
| Visual/UI | Screenshot via chrome tools if available |

Report per item: `✅ PASS` or `❌ FAIL (reason)`. All pass → Step 5. Failures → fix and re-verify (max 2 retries, then escalate).

**Cross-Phase Regression:** For `type: code` tasks, also run the Cross-Phase Regression Gate (see Qcode-run-task Step 4.8) to ensure prior phases have not regressed before marking completion.

### Security Verification (Mandatory for code + security keywords)

When `type: code` AND TASK_REQUEST contains any of: auth, crypto, payment, JWT, password, secret, token, credential, bcrypt:
1. Invoke `Esecurity-officer` agent with `git diff HEAD` context
2. Integrate findings into VERIFY_CHECKLIST security items
3. FAIL grade from Esecurity-officer blocks Step 5 until resolved

This is **mandatory**, not a recommendation.

## Step 4.5: Supervision Gate

After verification, run the Supervision Gate to get expert-level quality assessment.

**skip-supervision conditions** (skip if ALL true):
- Task is `type: docs` or `type: analysis` with fewer than 5 items
- Single-item tasks
- MD-only changes

**never skip-supervision for `type: code` tasks** — code always goes through the gate.

Track `supervision_iteration` counter in `.qe/state/session-stats.json` to persist across session compactions. Increment on each supervision round.

1. Invoke `Esupervision-orchestrator` with task context and verification results
2. If grade is PASS → proceed to Step 5
3. If grade is PARTIAL → apply suggested improvements, re-verify
4. If grade is FAIL → save REMEDIATION_REQUEST, re-execute failed items via Etask-executor

When role-separated orchestration is active:
- include `review-report.md` and `implementation-report.md` in the supervision packet
- require the supervisor to explicitly check whether role boundaries were respected
- write the final verdict to `.qe/ai-team/artifacts/verification-report.md`

**Agent Trigger Check:** After supervision, check `.qe/agent-triggers/` for trigger files written by agents during execution:
1. Glob `.qe/agent-triggers/*.trigger.md`
2. For each trigger: spawn the target agent with the provided context (in parallel if multiple)
3. Delete processed trigger files
4. If triggered agents produce new findings, append to verification results

Skip agent triggers if no trigger files exist.

## Step 5: Completion

1. Mark all items `[x]` in TASK_REQUEST and VERIFY_CHECKLIST
2. Move files to `completed/`
3. **Update Status**: Call `updateClaudeStatus(cwd, uuid, "✅")`. This updates the active task registry, preferring `.qe/TASK_LOG.md`.
4. `type: code` → call `Ecode-doc-writer`; `type: docs` → call `Edoc-generator`
5. Auto-run `/Qarchive` in background
6. Clean up `.qe/agent-results/` (delete result files older than current task)

Report: UUID, items completed, verification passed, changed files.

### Next Task Prompt

After completion, check for remaining tasks:
1. Read the project task registry first (`.qe/TASK_LOG.md` or equivalent active task tracker); use the legacy `CLAUDE.md` task table only as backward compatibility fallback
2. Also check `.qe/tasks/pending/` for queued TASK_REQUEST files
3. If next tasks exist, use `AskUserQuestion` to prompt:
   - List upcoming tasks (UUID + name)
   - Ask: "To execute the next task, run `/Qrun-task {UUID}`."
4. If no remaining tasks, skip this step

---

## Handoff
After task completion (Step 5), read `.qe/planning/ROADMAP.md` to build the Roadmap progress line, then branch by task type.

### When `type: code`
```
[Phase {X}: {PhaseName}] Implementation complete — moving to verification

Roadmap:  {phase progress line}
PSE Chain:  ✅ /Qplan  →  ✅ /Qgs  →  ✅ /Qrun-task  →  👉 /Qcode-run-task
```
```
Next command:

  /Qcode-run-task {UUID}
```

### When `type: docs` / `type: analysis` / deletion-heavy
After performing SIVS verification inline:
```
[Phase {X}: {PhaseName}] Complete

Roadmap:  {phase progress line}
PSE Chain:  ✅ /Qplan  →  ✅ /Qgs  →  ✅ /Qrun-task  →  ✅ Complete
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

---

## Special Situations

| Situation | Action |
|-----------|--------|
| No documents | Suggest `/Qgenerate-spec` |
| Task interrupted | Save progress with timestamps, leave in `in-progress/` |
| On hold | Move to `on-hold/`, set ⏸️ |
| Resume | Move to `in-progress/`, continue from last unchecked item |
| Etask-executor crash | Offer Resume/Retry/Abort |
| No project instruction file or legacy task table | Proceed without context, notify user |

## Multiple UUID Execution

**Parallel by default.** When multiple UUIDs are passed (space-separated), spawn one `Etask-executor` Agent per UUID concurrently.

### Execution Flow
```
/Qrun-task {UUID1} {UUID2} {UUID3}
  │
  ├─ Read all TASK_REQUESTs → check for inter-dependencies
  │
  ├─ No dependencies found (default):
  │    ├─ Agent spawn: Etask-executor(UUID1)  ─┐
  │    ├─ Agent spawn: Etask-executor(UUID2)  ─┼─ parallel
  │    └─ Agent spawn: Etask-executor(UUID3)  ─┘
  │         Each runs Steps 2-5 independently
  │
  └─ Dependencies found (fallback):
       └─ Sequential: UUID1 → UUID2 → UUID3
          (only when task B's input is task A's output)
```

### Parallel Execution Rules
1. **Spawn all agents in a single tool-call block** — do not await one before spawning the next
2. **File ownership**: no two agents may write the same file. If overlap detected, serialize those tasks
3. **Shared files** (i18n, config, barrel exports, package manifests): Qrun-task edits these after all agents complete, merging their requirements
4. **Independent state**: each agent moves its own TASK_REQUEST/VERIFY_CHECKLIST through `pending → in-progress → completed`
5. **On failure**: skip failed task, continue others, report all results at end

### Dependency Detection
Before spawning, scan each TASK_REQUEST for:
- Explicit `depends: {UUID}` in notes
- Output path of task A appearing as input reference in task B's checklist

If dependencies exist, topologically sort and execute in waves (parallel within each wave, sequential across waves).

## Autonomous Mode (Ultra)

When `.qe/state/ultra{work,qa}-state.json` is active:
- Skip Step 2 approval
- Auto-proceed on judgments
- `--ultraqa`: auto-run code quality loop
- Multiple UUIDs: parallel Etask-executor agents

## Coding Expert References

Reference `skills/coding-experts/` for language/framework best practices. Catalog: `skills/coding-experts/CATALOG.md`.

## Role Constraints
- Only executes existing spec documents
- Use `/Qgenerate-spec` to create specs
- Do not modify spec content (except checking off items)
- In role-separated or tiered orchestration, do not allow implementer-stage execution to mutate planner-owned artifacts except for explicitly approved planner revisions
