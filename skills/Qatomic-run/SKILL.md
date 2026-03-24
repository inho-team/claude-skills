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
- Provide each teammate with a **Handoff Packet** containing the specific item, expected outcome, and `ContextMemo`.
- Set teammates to `haiku` model for maximum speed and efficiency.

### Step 3: Result Synthesis
As Haiku teammates complete their tasks:
- Lead session (Sonnet) monitors progress and resolves any merge conflicts in shared files.
- Aggregate all changes into the main working branch.

### Step 4: Quality Loop
After all atomic items are done, automatically trigger `/Qcode-run-task` to ensure the combined implementation is architecturally sound.

## Execution Rules
- **Haiku-First**: Always use `haiku` for teammates unless an item is explicitly marked as `high` complexity.
- **Context Integrity**: Use `ContextMemo` to ensure teammates don't waste tokens re-reading the same specs.
- **Atomicity**: One teammate = One checklist item.

## Will
- Orchestrate parallel execution via Agent Teams
- Monitor Haiku teammate performance
- Synthesize results and handle merges

## Will Not
- Implement complex architectural changes (handle via standard **Etask-executor**)
- Bypass the quality loop
