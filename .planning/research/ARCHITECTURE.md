# Architecture Patterns: AI Agent Framework

**Domain:** AI Agent Framework Optimization
**Researched:** 2025-05-13

## Recommended Architecture

The QE Framework follows a **Hierarchical Orchestration** pattern with **Hook-based Augmentation**. This structure balances autonomy with safety and efficiency.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Intent Gate** | Classifies user intent and routes to skills/agents. | User, Skills, Agents |
| **Specialist Agents** | Executes domain-specific tasks (e.g., test generation, refactoring). | Tools, State, Files |
| **Hooks (Pre/Post)** | Injects context, checks for secrets, tracks tool errors. | All Tool Calls |
| **State Manager** | Persists session stats, intent routes, and task progress. | Hooks, Agents |
| **Agent Teams** | Manages parallel instances of Claude with partitioned contexts. | Lead Agent, Sub-Agents |

### Data Flow

```
User Input 
  → Intent Gate (Classify Intent)
    → Skill/Agent Invocation (Select Tier)
      → Pre-Tool Hook (Inject Context/Secret Check)
        → Tool Execution (Read/Write/Bash)
          → Post-Tool Hook (Error Tracking/Escalation)
            → Notification (Agent Chaining)
              → Final Response to User
```

## Patterns to Follow

### Pattern 1: Multi-Tier Model Cascading
**What:** Select models (Haiku/Sonnet/Opus) based on task complexity.
**When:** Every tool call or task initiation.
**Implementation:** `core/AGENT_TIERS.md`

### Pattern 2: Selective Context Budgeting
**What:** Prioritize information (Critical/Important/Reference) in the context window.
**When:** When context window pressure reaches 70% (150 tool calls).
**Implementation:** `core/CONTEXT_BUDGET.md`

### Pattern 3: File-Partitioned Parallelism
**What:** Assigning distinct files to different agents in a team.
**When:** When 3+ parallel workstreams are available.
**Implementation:** `core/AGENT_TEAMS.md`

## Anti-Patterns to Avoid

### Anti-Pattern 1: Context Bloat (Raw File Dumps)
**What:** Reading entire large files when only a specific signature is needed.
**Why bad:** Consumes token budget rapidly and increases latency.
**Instead:** Use `Glob` for discovery and `Read` for targeted line ranges.

### Anti-Pattern 2: Sequential-only Orchestration
**What:** Running all tasks one after another when they could be independent.
**Why bad:** Increases "human-in-the-loop" wait time unnecessarily.
**Instead:** Leverage `Agent Teams` for parallel file groups.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Latency** | Local hook scripts. | Edge-cached prompts. | Dedicated inference endpoints. |
| **Context** | File-based snapshots. | Shared semantic cache. | Global context vector DB. |
| **Collaboration**| Independent Claude instances. | Centralized task broker. | Swarm-based orchestration. |

## Sources

- `core/AGENT_TEAMS.md`
- `core/CONTEXT_BUDGET.md`
- `core/AGENT_TIERS.md`
- `core/INTENT_GATE.md`
