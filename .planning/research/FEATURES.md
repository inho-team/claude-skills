# Feature Landscape: AI Agent Performance

**Domain:** AI Agent Framework Optimization
**Researched:** 2025-05-13

## Table Stakes

Features users expect in any performant AI agent framework.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Intent Gating** | Prevents agent drift and inappropriate tool use. | Medium | Current `INTENT_GATE.md` provides robust keyword/profile mapping. |
| **Context Management** | Prevents session failure due to token limits. | High | `CONTEXT_BUDGET.md` defines a 40/30/20/10 split. |
| **Tool-use Hooks** | Allows pre/post-processing for safety and augmentation. | Low | `hooks/` implementation is already mature. |
| **Specialist Agents** | Focuses model expertise on specific task domains. | Medium | Agents in `agents/` are already well-partitioned. |

## Differentiators

Features that set `qe-framework` apart.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Agent Teams (Experimental)** | Parallelizes work across independent Claude instances with distinct contexts. | High | See `AGENT_TEAMS.md` for peer-to-peer patterns. |
| **Auto-Tiering & Escalation** | Automatically switches models (Haiku → Sonnet → Opus) based on difficulty. | Medium | Implemented in `AGENT_TIERS.md`. |
| **Agent Chaining (via Hooks)** | One agent automatically triggers another (e.g., Etask-executor → Earchive-executor). | Medium | Implemented in `notification.mjs`. |
| **Context Pressure Zones** | Proactively warns users when context is nearing limits (150/200/250 tool calls). | Low | Implemented in `pre-tool-use.mjs`. |

## Anti-Features

Features to explicitly NOT build to maintain performance.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Global Context Sharing** | Causes token bloat and confusion in multi-agent teams. | Use strict file partitioning and peer-to-peer messaging. |
| **Massive Toolsets** | Too many tools cause "hallucination" and drift. | Give agents only the tools they need for their specific role. |
| **Real-time Synchronization** | Adds excessive latency in high-latency LLM environments. | Use async/event-driven triggers (Hooks). |

## Feature Dependencies

```
Intent Gate → Agent Selection → Agent Tiering (Model selection)
Agent Execution → Pre/Post Hooks → Agent Chaining (Notification)
```

## MVP Recommendation

Prioritize:
1. **Semantic Compression for Compaction**: Move from simple snapshotting to LLM-summarized snapshots.
2. **Haiku-based Gatekeeping**: Switch `IntentGate` and `Secret Detection` to Haiku for near-instant validation.

Defer: **Real-time Multi-Agent Dashboard**: While visually appealing, it adds overhead compared to the current file-based logging.

## Sources

- `core/INTENT_GATE.md`
- `core/AGENT_TEAMS.md`
- `hooks/scripts/` implementation
