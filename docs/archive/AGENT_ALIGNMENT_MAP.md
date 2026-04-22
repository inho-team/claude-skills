# Agent Alignment Mapping

This map identifies the required changes for every agent to align with `core/AGENT_TIERS.md` and the `ContextMemo` protocol.

## Tier & Protocol Alignment

| Agent | Current Model | Target Model | Protocol Gap | Injection Point (Instructions) |
|-------|---------------|--------------|--------------|-------------------------------|
| `Earchive-executor` | haiku | haiku | ContextMemo | Before reading task files |
| `Ecode-debugger` | sonnet | sonnet | ContextMemo | Before reading source/logs |
| `Ecode-doc-writer` | sonnet | sonnet | ContextMemo | Before reading implementation |
| `Ecode-quality-supervisor` | haiku | haiku | ContextMemo | Before structural audit |
| `Ecode-reviewer` | sonnet | sonnet | ContextMemo | Before reading diffs |
| `Ecode-test-engineer` | sonnet | sonnet | ContextMemo | Before reading requirements |
| `Ecommit-executor` | haiku | haiku | ContextMemo | Before reading git status |
| `Ecompact-executor` | haiku | haiku | ContextMemo | (Already partially implemented) |
| `Edeep-researcher` | sonnet | opus | ContextMemo | Before reading research sources |
| `Edoc-generator` | haiku | haiku | ContextMemo | Before reading templates |
| `Edocs-supervisor` | haiku | haiku | ContextMemo | Before documentation audit |
| `Eanalysis-supervisor` | haiku | haiku | ContextMemo | Before analysis review |
| `Egrad-writer` | sonnet | sonnet | ContextMemo | Before reading citations |
| `Ehandoff-executor` | haiku | haiku | ContextMemo | Before collecting state |
| `Epm-planner` | sonnet | sonnet | ContextMemo | Before reading PRDs |
| `Eprofile-collector` | haiku | haiku | ContextMemo | Before reading patterns |
| `Eqa-orchestrator` | sonnet | sonnet | ContextMemo | (Already implemented) |
| `Erefresh-executor` | haiku | haiku | ContextMemo | Before re-analyzing project |
| `Esecurity-officer` | haiku | haiku | ContextMemo | Before scanning content |
| `Esupervision-orchestrator` | haiku | haiku | ContextMemo | Before quality assessment |
| `Etask-executor` | sonnet | sonnet | ContextMemo | (Already implemented) |

## Injection Pattern (ContextMemo)
All agents must include the following instruction block:
```markdown
## Minimal I/O Rule (ContextMemo)
Before performing any file I/O (Read, Grep, Glob), check for [MEMO HIT] hints from hooks. If available, use the cached content from your history to save token budget.
```
