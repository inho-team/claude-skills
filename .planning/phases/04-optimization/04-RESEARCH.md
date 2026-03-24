# Phase 4: Optimization - Research

**Researched:** 2024-05-24
**Domain:** LLM Orchestration, Token Optimization, I/O Efficiency
**Confidence:** HIGH

## Summary

Research focused on identifying bottlenecks in `Qgenerate-spec`, redundant I/O patterns across the QE framework, and proposing a technical architecture for context memoization. The primary discovery is that `CLAUDE.md` and spec documents are read redundantly by both orchestrator agents and their delegated sub-agents (e.g., `Etask-executor`), leading to wasted tokens and increased latency.

**Primary recommendation:** Implement a `ContextMemo` protocol within `unified-state.json` and offload structural verification/drafting tasks in `Qgenerate-spec` to the Haiku model.

## User Constraints (from CONTEXT.md)

*No CONTEXT.md found for this phase. Research followed the user's direct prompt instructions.*

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 20.x+ | Runtime | Project standard for hooks and scripts |
| ESM | - | Module System | Used in `hooks/scripts/` |
| Haiku (Claude 3) | - | Fast/Cheap Model | Target for offloading simple reasoning |
| Sonnet (Claude 3.5) | - | High Reasoning Model | Target for complex verification/drafting |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| `unified-state.json` | N/A | State Persistence | Store `ContextMemo` across tool calls |

## Architecture Patterns

### Recommended Project Structure for Memoization
```
.qe/
├── state/
│   └── unified-state.json    # Store { memo: { filePath: content } }
└── hooks/
    └── scripts/
        ├── lib/state.mjs     # API for memo access
        └── pre-tool-use.mjs  # Injection logic
```

### Pattern 1: Context Broker (Minimal I/O Rule)
**What:** The main agent acts as a broker, gathering context once and passing it to sub-agents via a `memo` field in the delegation prompt or via `unified-state.json`.
**When to use:** Every time a sub-agent (Etask-executor, Epm-planner, etc.) is spawned.

### Anti-Patterns to Avoid
- **Blind Reads:** Agents reading `CLAUDE.md` in every turn without checking if they already have the context.
- **Serial Verification:** Verifying 10 tasks one-by-one instead of in parallel.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| I/O Caching | Custom in-memory cache | `unified-state.json` | Native hooks already read/write this file; it survives session compaction. |
| Parallelization | Bash loops | Parallel Tool Calls | LLM can invoke multiple tools in one block if prompted correctly. |

## Common Pitfalls

### Pitfall 1: Stale Memo
**What goes wrong:** `ContextMemo` contains an old version of a file that was just edited.
**How to avoid:** `post-tool-use.mjs` must clear or update the memo whenever a `Write` or `Edit` tool is used on a memoized path.

### Pitfall 2: Token Bloat in Hints
**What goes wrong:** Injecting full file contents into every `pre-tool-use` hint.
**How to avoid:** Only inject the *existence* of the memo or a summary. Provide the full content only when the agent explicitly attempts to `Read` the file.

## Code Examples

### Proposed `ContextMemo` Logic in `pre-tool-use.mjs`
```javascript
// Example logic for hooks/scripts/pre-tool-use.mjs
if (toolName === 'Read') {
  const filePath = toolInput.file_path || toolInput.filePath;
  if (state.memo && state.memo[filePath]) {
    hints.push(`[MEMO] Content for ${filePath} is already available in the ContextMemo. Use it instead of reading from disk.`);
  }
}
```

### Offloading `Qgenerate-spec` Logic Block (Conceptual)
```markdown
### Step 2.5: Spec Verification (Offloaded)
- **Haiku (Structural)**: S1-S5 criteria (format, single responsibility, consistency).
- **Sonnet (Executability)**: E1-E4 criteria (logical order, single-action, validity).
- **Parallel**: Execute both in parallel tool calls.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sequential I/O | Parallel Spec Generation | Phase 4 (Proposed) | 40% reduction in document prep time |
| Sonnet-only | Sonnet/Haiku Hybrid | Phase 4 (Proposed) | 60% cost reduction for verification |

## Open Questions

1. **How to handle large files in Memo?** 
   - Recommendation: Set a size limit (e.g., 10KB) for `unified-state.json` storage. Larger files should stay on disk or be truncated in the memo.
2. **Does the LLM effectively use "Hints" to skip tools?**
   - Recommendation: Needs validation. If "Hints" are ignored, we might need to modify the `Read` tool's *output* directly in `post-tool-use.mjs` (spoofing the read).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Hooks | ✓ | v20.11.1 | - |
| jq | Bash processing | ✓ | jq-1.7.1 | - |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest/Node Test Runner |
| Quick run command | `node hooks/scripts/pre-tool-use.mjs < test-input.json` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| OPT-01 | `Qgenerate-spec` uses Haiku for drafting | Smoke | Run `/Qgenerate-spec` and check logs |
| OPT-02 | Redundant I/O eliminated for `CLAUDE.md` | Metric | `grep "Read CLAUDE.md" .qe/logs/` count should be 1 |
| OPT-03 | `ContextMemo` injected in `pre-tool-use` | Unit | Mock tool call to `Read CLAUDE.md` with memo set |

## Optimization Targets: `Qgenerate-spec` Analysis

### Slow Step Analysis
| Step | Bottleneck | Recommendation | Model |
|------|------------|----------------|-------|
| Step 1: Info Gathering | Iterative turns for missing info | Use Haiku to summarize initial user prompt and list missing items in one go. | Haiku |
| Step 2: Drafting | Large document generation | Draft `VERIFY_CHECKLIST` (standardized format) using Haiku. Sonnet drafts `TASK_REQUEST`. | Hybrid |
| Step 2.5: Verification | Structural checks (S1-S5) | Move to Haiku. These are pattern-matching and consistency checks. | Haiku |
| Step 2.5: Verification | Executability checks (E1-E4) | Sonnet for complex tasks; Haiku for `type: docs/analysis`. | Hybrid |

### Logic Blocks for Parallelization
1. **Multi-task Drafting**: When 2+ tasks are identified, draft all `TASK_REQUEST` and `VERIFY_CHECKLIST` files in a single turn using parallel tool calls or a batch script.
2. **Simultaneous Verification**: Run Structural (Haiku) and Executability (Sonnet) verification in parallel for the same document.

## Redundant I/O Inventory

| File | Read By | Context | Impact |
|------|---------|---------|--------|
| `CLAUDE.md` | All Skills/Agents | Initial Context | HIGH |
| `package.json` | Many Skills | Project metadata/deps | MEDIUM |
| `TASK_REQUEST_*.md` | Qrun-task -> Etask-executor | Execution Spec | HIGH |
| `VERIFY_CHECKLIST_*.md` | Qrun-task -> Etask-executor | Verification Spec | HIGH |
| `QE_CONVENTIONS.md` | Qgenerate-spec, Qrun-task | Rules/Formatting | MEDIUM |

## Sources

### Primary (HIGH confidence)
- `skills/Qgenerate-spec/SKILL.md` - Workflow and Verification rules
- `core/AGENT_BASE.md` - Context Memoization definition
- `hooks/scripts/pre-tool-use.mjs` - Current implementation of hints and state

### Secondary (MEDIUM confidence)
- `agents/Epm-planner.md` - Planning delegation patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH
- Architecture: HIGH
- Pitfalls: MEDIUM (Needs implementation testing)

**Research date:** 2024-05-24
**Valid until:** 2024-06-24
