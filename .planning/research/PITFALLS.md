# Domain Pitfalls: AI Agent Performance

**Domain:** AI Agent Framework Optimization
**Researched:** 2025-05-13

## Critical Pitfalls

Mistakes that cause rewrites or major session failures.

### Pitfall 1: Context Window Overflow (The "Alzheimer" Effect)
**What goes wrong:** The agent's context window fills up, causing it to "forget" earlier requirements or critical task state.
**Why it happens:** Excessive tool calls (250+), large file reads, or deep conversation history.
**Consequences:** The agent hallucinates solutions or fails to follow instructions from the original prompt.
**Prevention:** Implement proactive context budgeting (40/30/20/10) and periodic compaction (`Ecompact-executor`).
**Detection:** Monitor `tool_calls` in `session-stats.json`. Warn at 150/200/250.

### Pitfall 2: Multi-Agent Race Conditions (The "Clash" Effect)
**What goes wrong:** Two or more agents in a team attempt to edit the same file simultaneously or overwrite each other's changes.
**Why it happens:** Overlapping file ownership or lack of clear partitioning in the spawn prompt.
**Consequences:** Broken builds, lost code, and conflicting implementation patterns.
**Prevention:** Enforce strict file ownership rules (`AGENT_TEAMS.md`). Lead must partition work before spawning teammates.
**Detection:** Track file access in hook scripts and flag concurrent modifications.

## Moderate Pitfalls

### Pitfall 1: Intent Routing Loop
**What goes wrong:** User's ambiguous message (e.g., "fix it") causes the Intent Gate to route to the wrong agent or trigger an infinite loop of clarification requests.
**Prevention:** Use behavioral ambiguity detection in `prompt-check.mjs`. Use historical user profiles (`Qprofile`) for better disambiguation.

### Pitfall 2: Over-utilization of HIGH Tier Models
**What goes wrong:** Using Opus (HIGH tier) for simple tasks like file renaming or text formatting.
**Prevention:** Apply model cascading rules (`AGENT_TIERS.md`). Use Haiku for LOW tier tasks and escalation only when necessary.

## Minor Pitfalls

### Pitfall 1: Stale Analysis
**What goes wrong:** Agents rely on `.qe/analysis/` files that haven't been refreshed after significant code changes.
**Prevention:** Implement `Erefresh-executor` to sync analysis files and trigger it via `notification.mjs` after major task completion.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Multi-Agent Setup** | Race conditions/Overlap | Strict file partitioning rules. |
| **Context Compaction** | Information loss | Semantic compression instead of simple truncation. |
| **Model Cascading** | Latency/Cost drift | Regular audits of `session-stats.json` for model distribution. |

## Sources

- `core/CONTEXT_BUDGET.md`
- `core/AGENT_TEAMS.md`
- `hooks/scripts/` behavior tests (`test-hooks.js`)
- Ecosystem research (LangGraph, CrewAI best practices)
