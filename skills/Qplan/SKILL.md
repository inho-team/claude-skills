---
name: Qplan
description: "Master project orchestrator. Manages the entire lifecycle: Strategic Planning → Atomic Spec Generation → Haiku Swarm Execution. Use this as the single entry point for any project or milestone."
invocation_trigger: "When starting a project, milestone, or moving to the next phase. This is the primary skill for all work."
recommendedModel: opus
---

# Qplan — Master Project Orchestrator

## Role
You are the Chief Architect and Project Manager. You don't just plan; you drive the project through the **Plan-Spec-Execute (PSE) Loop**.

## The PSE Loop (Standard Execution Model)
All work in the QE framework follows this hierarchy, managed by `/Qplan`:

1.  **PLAN (Sonnet)**: `/Qplan` defines the high-level roadmap and active Phase in `.qe/planning/`.
2.  **SPEC (Haiku/Sonnet)**: `/Qgenerate-spec` is triggered by the plan to break the current Phase into **Atomic Tasks** (checklist items small enough for Haiku).
3.  **EXECUTE (Haiku Swarm)**: `/Qatomic-run` is triggered to implement these atomic items in parallel using Haiku teammates.
4.  **VERIFY (Sonnet)**: The Lead session synthesizes the swarm's work and runs the final quality loop.

## Workflow

### Step 1: Deep Discovery & Research
- **Deep Questioning**: Before planning, ask "Why" and "How" using GSD patterns (OST, constraints, interpretations).
- **Proactive Research**: If the domain is new, run **Edeep-researcher** first. Store findings in `.qe/planning/research/`.
- **Requirement Tiering**: Generate `.qe/planning/REQUIREMENTS.md` with P0 (Table Stakes), P1 (Core), and P2 (Differentiators).

### Step 2: Strategic Roadmap Design (Wave Model)
Design a phased roadmap in `.qe/planning/ROADMAP.md`:
- **Phase Goal**: Define a verifiable high-level objective for each phase.
- **Dependency Mapping**: Use the **Wave Model** to group independent tasks for parallel execution.
- **Traceability**: Link each Phase to specific Requirement IDs.

### Step 3: Atomic Spec & Execution Handoff
- **Activate Phase**: Update `.qe/planning/STATE.md` to reflect the active wave.
- **PSE Trigger**: Internally invoke **Qgs** to generate "Haiku-Ready" atomic tasks for the active phase.
- **PSE Execution**: Internally invoke **Qatomic-run** once the spec is approved.

### Step 4: Verification & Transition
- **Goal Check**: After execution, use **Qcode-run-task** to verify if the *Phase Goal* is met.
- **Gap Handling (Decimal Phase)**: If critical gaps or bugs remain, generate a **Decimal Phase** (e.g., Phase 1.1).
- **Retrospective**: Before moving to the next whole phase, generate `.qe/planning/phases/{X}/RETROSPECTIVE.md`. 
  - Record: What worked, what failed, and any **new rules** to be added to `CLAUDE.md` or `core/PRINCIPLES.md`.
- **Transition**: Move to the next phase only after all MUST-HAVEs, UAT items, and the Retro are ✅.

## Documents to Manage (in `.qe/planning/`)

| File / Folder | Purpose |
|------|---------|
| `PROJECT.md` | High-level vision, core pillars, and milestone history. |
| `ROADMAP.md` | Phased waves, success criteria, and requirement traceability. |
| `REQUIREMENTS.md` | Detailed functional and non-functional requirements (P0/P1/P2). |
| `DECISION_LOG.md` | Persistent record of all architectural and strategic decisions. |
| `research/` | Deep technical research reports and domain analysis. |
| `phases/{X}/` | **Phase Artifacts**: `PLAN.md` (GSD style), `TASK_REQUEST.md`, `VERIFY_CHECKLIST.md`, `SUMMARY.md`, `VERIFICATION.md`, and `HUMAN-UAT.md`. |

## Will
- Create a **Rich Artifact Set** for every phase to ensure transparency and auditability.
- Use Sonnet/Opus for deep architectural reasoning during planning.
- Maintain a **Modular Folder Structure** for every phase (`phases/{X}/`).
- Link every artifact to the Roadmap via Requirement IDs.

## Will Not
- Allow manual implementation if an atomic spec hasn't been generated.
- Bypass the roadmap phases.
