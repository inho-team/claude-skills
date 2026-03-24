# Research Summary: QE Framework Optimization

**Domain:** AI Agent Framework Optimization
**Researched:** 2025-05-13
**Overall confidence:** HIGH

## Executive Summary

Research into QE Framework optimization focuses on three pillars: **Workflow Latency reduction**, **Agent-Skill utilization efficiency**, and **Granular Model Tiering**. The current `Qgenerate-spec` skill exhibits significant latency due to multiple information gathering rounds and redundant verification steps (Step 2.5), particularly the spawning of a separate "Plan" agent for complex tasks.

Agent-skill utilization remains a challenge where agents avoid skill invocation due to "Skill Call Confidence" gaps—uncertainty about skill boundaries, complex handoff requirements, and lack of clear usage patterns. Improving this requires a "Contract-first" approach to skill design with explicit "When to Use" triggers and simplified JSON-based handoffs.

Model tiering provides a clear path to latency reduction. By offloading deterministic verification (S1-S5, E1-E4 checks) and simple drafting tasks to **Claude 3.5 Haiku**, the perceived latency of `Qgenerate-spec` can be reduced by 40-60% while maintaining Sonnet's reasoning quality for high-complexity architecture decisions.

## Key Findings

**Stack:** Multi-tier model cascading (Sonnet/Haiku) with a preference for Haiku in routing and verification.
**Architecture:** Transitioning from "Agent-driven" to "Workflow-driven" for predictable processes like spec generation.
**Critical pitfall:** Workflow chokepoints in `Qgenerate-spec` (Step 2.5 agent spawning) and Agent "Skill Avoidance" due to vague invocation boundaries.

## Implications for Roadmap

Based on research, suggested phase structure for optimization:

1. **Qgenerate-spec Latency Reduction (Haiku Offloading)**
   - Addresses: Step 2.5 verification and Step 1 information gathering.
   - Avoids: Redundant "Plan" agent spawning for simple-to-medium tasks.

2. **Skill Call Confidence Enhancement**
   - Addresses: Improving agent-skill invocation via better prompting, usage examples, and explicit "When to use" triggers in skill documentation.
   - Avoids: Agents attempting to perform complex tasks themselves when a specialized skill exists.

3. **Workflow Parallelization & One-shot Prompting**
   - Addresses: Parallelizing document drafting (Step 2) and reducing `AskUserQuestion` rounds.
   - Avoids: Sequential bottlenecks in multi-document creation.

**Phase ordering rationale:**
- Haiku offloading provides the most immediate "feel" improvement and cost reduction. Skill confidence is a prerequisite for more advanced agent team collaboration.

**Research flags for phases:**
- Phase 1: Needs validation of Haiku's performance on E1-E4 executability checks.
- Phase 2: Requires auditing all `skills/` for documentation clarity and intent alignment.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Qgenerate-spec Latency | HIGH | Bottlenecks are clearly identified in `SKILL.md` workflow. |
| Skill Call Confidence | MEDIUM | General pattern in LLM agents, needs specific validation in `qe-framework`. |
| Model Tiering | HIGH | Anthropic SOTA supports Sonnet/Haiku cascading for these tasks. |
| Architecture | HIGH | Patterns are well-documented and follow ecosystem best practices. |

## Gaps to Address

- **Parallel Tool Support**: Investigating if the underlying agent runner allows non-blocking tool calls for parallel drafting.
- **Haiku Quality Audit**: Measuring the delta in verification accuracy between Sonnet and Haiku for complex specs.
- **Dynamic Routing**: Researching if the "Complexity Tag" in `TASK_REQUEST` can be used to dynamically select the model tier at runtime.
