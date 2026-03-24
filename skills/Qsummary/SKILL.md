---
name: Qsummary
description: "Summarizes the session's work, including completed tasks and current technical state. Use when finishing a session or providing a status report."
invocation_trigger: "When work summary is needed or the session is concluding."
recommendedModel: haiku
---

# Qsummary — Session Status & Handoff Summary

## Role
Generates a high-density summary of the current session to ensure the user and future agents understand the progress and momentum.

## Workflow

### Step 1: Data Collection
Gather the following high-signal data:
1. **State Stats**: Read `.qe/state/unified-state.json` for token usage and tool call counts.
2. **Completed Tasks**: Scan `.qe/tasks/completed/` for recently finished `TASK_REQUEST` titles.
3. **Semantic Context**: Read `.qe/context/SNAPSHOT_SUMMARY.md` (if available) for the current "vibe" and technical state.

### Step 2: High-Density Summary Generation
Use the **Haiku model** to synthesize the data into a maximum of 5-7 lines. 
Focus on:
- **What**: Core achievements and modified files.
- **Why**: The architectural reason behind the changes (The "Philosophy").
- **Next**: Immediate next steps for the following session.

### Step 3: Output Format
Display the summary in a clean markdown block:

```markdown
## 🍎 Session Summary [Date]

- **Achievements**: [What was done]
- **Architectural Shift**: [Why/How it changed]
- **Current State**: [Token status / Momentum]
- **Next Steps**: [Pending tasks]
```

## Mandatory Constraints
- **Keep it short**: No conversational filler or repetitive explanations.
- **Accuracy First**: Ensure the summary matches the actual state of the `.qe/` directory.
- **Low Cost**: Always use the Haiku tier for this summary.

## Will
- Analyze session history and state
- Provide a concise status report
- Focus on technical intent

## Will Not
- Re-read every conversation turn (use the state files)
- Write long prose
