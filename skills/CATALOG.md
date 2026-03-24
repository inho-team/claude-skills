# QE Framework Skill Catalog

> **MANDATORY READ FOR AGENTS**: Before performing any complex task manually, search this catalog for a matching skill. Prioritize using skills over manual labor to ensure consistency and speed.

## Core Execution Skills

| Skill | Invocation Trigger | Core Benefit |
|-------|-------------------|--------------|
| `/Qrun-task` | When a TASK_REQUEST or checklist needs implementation or verification. | Automates step-by-step execution, state transitions, and verification. |
| `/Qatomic-run` | When a TASK_REQUEST contains many independent, simple checklist items. | Uses Haiku Swarm to execute atomic items in parallel for maximum speed. |
| `/Qgenerate-spec` | When a new project, task, or bug fix spec needs to be defined. | Creates structured CLAUDE.md, TASK_REQUEST, and VERIFY_CHECKLIST files. |
| `/Qcode-run-task` | When code has been modified and needs a quality loop (test-review-fix). | Ensures code quality through automated testing and expert review. |
| `/Qcommit` | When changes are ready to be staged and committed to git. | Generates natural, human-like commit messages and handles staging. |
| `/Qcompact` | When the context window is full or under pressure (Orange/Red zone). | Preserves state and creates handoff documents for session continuity. |
| `/Qresume` | When starting a new session or resuming from a handoff. | Restores previous context and task state from snapshots. |
| `/Qrt` | Alias for `/Qrun-task`. Use for faster invocation. | Quick access to task execution. |
| `/Qgs` | Alias for `/Qgenerate-spec`. Use for faster invocation. | Quick access to spec generation. |

## Specialized Quality & Debugging

| Skill | Invocation Trigger | Core Benefit |
|-------|-------------------|--------------|
| `/Qsystematic-debugging` | When a bug is reported or a test fails repeatedly. | Applies scientific method to isolate and fix root causes. |
| `/Qtest-driven-development` | When starting a new feature that requires robust testing. | Implements TDD workflow (Red-Green-Refactor). |
| `/Qsource-verifier` | When you need to verify if source code matches the provided specs. | Deep integrity check between implementation and TASK_REQUEST. |
| `/Qvisual-qa` | When UI/Frontend changes need verification. | Uses screenshots and visual analysis to find regressions. |
| `/Qsecurity-officer` | When security-sensitive code (auth, crypto) is modified. | Specialized security audit and vulnerability detection. |

## Management & Automation

| Skill | Invocation Trigger | Core Benefit |
|-------|-------------------|--------------|
| `/Qutopia` | When you want to enable fully autonomous execution mode. | Switches framework to ultra-mode (auto-approvals, auto-remediation). |
| `/Qinit` | When starting a new project or initializing the QE framework. | Sets up directory structure, conventions, and core configuration. |
| `/Qupdate` | When the QE framework or its components need updating. | Syncs latest framework logic and templates. |
| `/Qversion` | When you need to check the current framework version. | Displays version info and recent changelog. |
| `/Qarchive` | When a task is completed and needs to be archived. | Moves files to archive and cleans up temporary state. |
| `/Qsummary` | When work summary is needed or the session is concluding. | Generates a high-density report of "What, Why, Next". |

## Documentation & Research

| Skill | Invocation Trigger | Core Benefit |
|-------|-------------------|--------------|
| `/Qdoc-comment` | When code needs JSDoc or internal comments. | Standardizes documentation across the codebase. |
| `/Qautoresearch` | When deep domain knowledge or external API research is needed. | Automates technical research and summarizes findings. |
| `/Qwriting-clearly` | When documentation or reports need to be more concise and clear. | Improves readability and signal-to-noise ratio. |

---

*Note: For Best Practices by language/framework, see `skills/coding-experts/CATALOG.md`.*
