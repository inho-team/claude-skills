# CONTEXT_BUDGET.md -- Token Budget Allocation Strategy

> Referenced by: Ecompact-executor, MODE_TokenEfficiency.md

## Purpose

Defines how to prioritize information when context window space is limited.
Used by Ecompact-executor when saving snapshots and by all agents when deciding what to include in context.

## Budget Allocation

| Priority | Allocation | Category | Examples |
|----------|-----------|----------|----------|
| Critical | 40% | Current task execution | Active TASK_REQUEST, target source files, user requirements, checklist |
| Important | 30% | Supporting context | Related source files, test files, configuration, dependencies |
| Reference | 20% | Background knowledge | `.qe/analysis/` files, documentation, architectural context, examples |
| Reserve | 10% | Recovery buffer | Error recovery, follow-up questions, unexpected context needs |

**Why 40/30/20/10:**
The split is ordered by recoverability cost. If Critical context is absent, the agent cannot proceed at all — it does not know what to build or where. If Important context is absent, errors occur but can be corrected with re-reads. If Reference context is absent, quality degrades but work continues. The Reserve exists because context overruns are unpredictable; without a buffer, a single unexpected tool call can cause truncation of Critical context, which is the worst failure mode. The 10% reserve is the minimum that absorbs common overruns (one extra file read, a longer-than-expected tool response) without wasting significant budget.

## Application Rules

### During Snapshot Save (Ecompact-executor)

1. **Critical**: Always include in `snapshot.md` -- active task UUID, current checklist state, files being modified, key decisions made.
2. **Important**: Include if within 200-line limit -- related file paths (not content), test file paths, config that affects the task.
3. **Reference**: Include as one-line summaries only -- "Architecture: see `.qe/analysis/architecture.md`".
4. **Reserve**: Do not consume -- leave room for post-restore orientation.

### During Active Work (All Agents)

1. **Critical**: Read fully and keep in context.
2. **Important**: Read on demand, summarize after use.
3. **Reference**: Read `.qe/analysis/` summaries instead of scanning raw files.
4. **Reserve**: Do not pre-load "just in case" context.

## Context Pressure Zones

| Zone | Input Tokens | Action |
|------|--------------|--------|
| Green | 0 - 100k | Normal operation |
| Yellow | 100k - 140k | Prefer `.qe/analysis/` summaries; trigger semantic compression |
| Orange | 140k - 170k | **Auto-Triggered**: Context monitor emits directive to invoke `Ecompact-executor` |
| Red | 170k+ | **Auto-Triggered (Mandatory)**: Context monitor forces immediate compaction |

**Why these token-based boundaries:**
- **Green (0-100k)**: Most tasks operate safely within the first 100k tokens (50% of a 200k window). Full context is preserved.
- **Yellow (100k-140k)**: Token accumulation accelerates. Switching to `.qe/analysis/` summaries and triggering `Ecompact-executor`'s **Semantic Compression** (Haiku-tier summary) at 140k ensures context integrity before the window is too full.
- **Orange (140k-170k)**: At 140k tokens, the window is ~70% full. The context monitor **automatically** emits a system directive instructing Claude to invoke `Ecompact-executor`. This is no longer advisory -- the hook outputs an `ACTION REQUIRED` message with the exact Agent tool invocation to run.
- **Red (170k+)**: Beyond 170k tokens (~85%), context drift and truncation become imminent. The context monitor emits a **MANDATORY** stop directive. All current work pauses until compaction completes. This directive overrides the cooldown period.

## Auto-Compaction Behavior

When context pressure reaches the Orange zone (140k tokens), the `context-monitor.mjs` hook automatically:

1. **Emits a system directive** (not just an advisory) instructing Claude to invoke `Ecompact-executor` via the Agent tool.
2. **Records the trigger** in `unified-state.json` under the `contextCompaction` key:
   - `lastTriggeredAt`: ISO timestamp of when auto-compaction was triggered
   - `autoTriggered`: `true` (distinguishes from manual invocations)
   - `cooldownUntil`: ISO timestamp 5 minutes after the trigger (prevents repeated firing)
3. **Enforces a 5-minute cooldown** after each trigger to avoid redundant compaction cycles.
4. **CRITICAL overrides cooldown**: At 170k tokens, the mandatory directive fires regardless of cooldown state.

### Cooldown Rationale
Without cooldown, every tool call between 140k and the completion of compaction would re-emit the directive, flooding the context with duplicate instructions. The 5-minute window gives `Ecompact-executor` enough time to complete its snapshot save before the monitor checks again.

## Token Estimation Fallback (Minimal I/O Rule)

When real-time API usage metrics are unavailable, use the following calculation:
- **Rule**: `Total Characters / 4 = Estimated Tokens`
- **Application**: All hooks (`pre-tool-use`, `post-tool-use`) must use this fallback to update `unified-state.json` if the `usage` payload is missing.

## ContextMemo Enforcement (Hard Block)

The `pre-tool-use` hook **enforces** the Minimal I/O Rule by blocking redundant `Read` calls at the hook level:

- **First read**: Always allowed. Content is cached in `unified-state.json` under `memo.files` with metadata in `memo.meta`.
- **Subsequent read of the same file**: Blocked with `exit(2)` if the file has not been modified since the last read. The agent receives a `MEMO HIT` message on stderr directing it to use the cached content.
- **After Write/Edit**: The memo entry is marked `modifiedSince: true` and cached content is cleared. The next Read is allowed and re-populates the cache.
- **Tracking**: `memo.meta[filepath]` stores `{ readAt, modifiedSince, contentSize }`. `memo.blocked_reads` counts total blocked reads per session.

This is not advisory — the hook hard-blocks the tool call. Agents cannot override this behavior.

## Anti-Patterns

- Loading entire files when only a function signature is needed
- Reading all analysis files at session start (read on demand)
- Keeping historical context that is no longer relevant to the active task
- Duplicating information already in `.qe/context/snapshot.md`
- Reading the same file twice in one session without modifying it (now enforced by hook)
