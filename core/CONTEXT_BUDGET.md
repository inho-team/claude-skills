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
| Orange | 140k - 170k | **Snapshot Required**: Run `Ecompact-executor` immediately |
| Red | 170k+ | **Critical**: Immediate compaction or session termination |

**Why these token-based boundaries:**
- **Green (0-100k)**: Most tasks operate safely within the first 100k tokens (50% of a 200k window). Full context is preserved.
- **Yellow (100k-140k)**: Token accumulation accelerates. Switching to `.qe/analysis/` summaries and triggering `Ecompact-executor`'s **Semantic Compression** (Haiku-tier summary) at 140k ensures context integrity before the window is too full.
- **Orange (140k-170k)**: At 140k tokens, the window is ~70% full. Capturing a snapshot at this point allows for a complete state save while there is still enough output token budget to write it cleanly.
- **Red (170k+)**: Beyond 170k tokens (~85%), context drift and truncation become imminent. User intervention or hard compaction is mandatory to prevent task failure.

## Token Estimation Fallback (Minimal I/O Rule)

When real-time API usage metrics are unavailable, use the following calculation:
- **Rule**: `Total Characters / 4 = Estimated Tokens`
- **Application**: All hooks (`pre-tool-use`, `post-tool-use`) must use this fallback to update `unified-state.json` if the `usage` payload is missing.

## Anti-Patterns

- Loading entire files when only a function signature is needed
- Reading all analysis files at session start (read on demand)
- Keeping historical context that is no longer relevant to the active task
- Duplicating information already in `.qe/context/snapshot.md`
