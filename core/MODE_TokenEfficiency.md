# MODE_TokenEfficiency — Token Efficiency Mode

## Overview
A mode that automatically switches response style based on context window pressure level.

## Activation Conditions
- Automatic: when context usage reaches 75% or above
- Manual: when the user requests "compressed mode" or "be concise"

## 3-Zone System (Token-Based)

### Green (0–100k tokens) — Normal Mode
- Detailed explanations and examples included
- Full code blocks shown
- Alternatives compared

### Yellow (100k–140k tokens) — Compressed Mode
- Deliver only the essentials
- Code blocks show only the changed portions
- Explanations limited to 1–2 sentences
- **Trigger**: Semantic Compression pass via `Ecompact-executor`.

### Red (140k–170k+ tokens) — Survival Mode
- One-line answers
- Code shown as diff only
- Minimize reading new files
- **Hard Stop**: At 170k tokens, immediate handoff or compaction via `Qcompact` is mandatory.
- If task cannot complete, suggest handoff.


## Compression Techniques
- Remove repeated explanations
- Do not re-state previous conversation content
- Minimize confirmation questions (execute immediately when obvious)
- Parallelize tool calls

## Haiku-Tier Task Offloading
To maximize efficiency and reduce latency, the following low-complexity/high-volume tasks should be offloaded to the **Haiku (LOW) tier**:
- **Intent Gating**: Initial classification of user prompts (via `prompt-check.mjs`).
- **Semantic Summarization**: Context compression and snapshot generation (via `Ecompact-executor`).
- **Commit Message Generation**: Drafting structured commit messages based on staged changes (via `Ecommit-executor`).
- **Secret Scanning**: Regex-based and heuristic security checks in hooks.
- **Trivial Refactoring**: Simple renaming, formatting, or lint fixing.

*Principle*: If the task requires pattern recognition or structured output rather than deep architectural reasoning, use Haiku.

## Deactivation
- When the user requests "detailed" or "verbose mode"
- Auto-reset at the start of a new session
