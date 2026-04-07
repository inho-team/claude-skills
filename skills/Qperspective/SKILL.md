---
name: Qperspective
description: 'Analyze a problem from multiple perspectives simultaneously. Spawns parallel sub-agents each adopting a different viewpoint (user, developer, PM, security, business, etc.) or routes to Codex for an independent view. Use when the user needs to see a problem from different angles before deciding.'
invocation_trigger: When the user wants to see multiple viewpoints, different angles, or alternative perspectives on a problem or decision.
recommendedModel: sonnet
---

# Qperspective — Multi-Perspective Analysis

## Role
Analyzes a single problem from multiple independent viewpoints simultaneously. Each perspective runs as a separate sub-agent, ensuring genuinely independent analysis without contamination between viewpoints.

## CLI Interface

```
/Qperspective <topic>                         # Auto-select relevant perspectives
/Qperspective <topic> --views "dev,pm,user"   # Specify perspectives manually
/Qperspective <topic> --codex                 # Add Codex as an independent perspective
/Qperspective --help                          # Show usage
```

## Available Perspectives

| Perspective | Asks | Best for |
|-------------|------|----------|
| `developer` | "Is this implementable? What's the technical cost?" | Architecture, tech debt decisions |
| `user` | "Does this actually solve my problem?" | Feature prioritization, UX |
| `pm` | "Does this fit the roadmap? What's the ROI?" | Scope, resource allocation |
| `security` | "What can go wrong? What's the attack surface?" | Auth, data handling, infra |
| `business` | "Does this make money? What's the market risk?" | Strategy, pricing, GTM |
| `ops` | "Can we run this in production? What breaks at scale?" | Deployment, monitoring |
| `newcomer` | "I don't understand any of this. Explain it simply." | Complexity check, onboarding |
| `critic` | "This will fail because..." | Risk assessment, blind spots |
| `codex` | Independent analysis from a different model | Cross-model validation |

## Execution Procedure

### Step 1: Parse input
- Extract the topic/problem
- If `--views` specified, use those perspectives
- If not, auto-select 3-4 most relevant perspectives based on the topic
- If `--codex` flag, add Codex as an additional perspective

### Step 2: Confirm perspectives

```
Topic: "Should we migrate from REST to GraphQL?"

Selected perspectives:
  1. developer  — technical feasibility and migration cost
  2. user       — API consumer experience
  3. ops        — production complexity and monitoring
  4. codex      — independent cross-model analysis

Proceed? [Y/n]  (or specify: --views "dev,security,pm")
```

### Step 3: Run perspectives in parallel

Spawn one sub-agent per perspective, all running simultaneously:

**Each agent receives:**
- The topic/problem statement
- Their assigned perspective and guiding question
- Instruction to analyze ONLY from their viewpoint
- No access to other perspectives' outputs

**For Codex perspective:**
- Route via codex-plugin-cc using `resolveEngine`
- Falls back to an additional Claude sub-agent if unavailable

**Each agent outputs:**
- Assessment (3-5 key points from their viewpoint)
- Risks they see
- Opportunities they see
- One recommendation

### Step 4: Display results

```
Multi-Perspective Analysis
──────────────────────────

Topic: "Should we migrate from REST to GraphQL?"

┌─ Developer ──────────────────────────────────┐
│ Assessment:                                   │
│   - Migration cost: ~3 sprints for core APIs  │
│   - N+1 query risk without DataLoader         │
│   - Type safety improves with codegen         │
│ Risk: Schema design mistakes are hard to fix  │
│ Opportunity: Eliminate over-fetching on mobile │
│ Recommendation: Start with BFF, not full swap │
└───────────────────────────────────────────────┘

┌─ User ───────────────────────────────────────┐
│ Assessment:                                   │
│   - Current REST API requires 3 calls for ... │
│   ...                                         │
└───────────────────────────────────────────────┘

┌─ Ops ────────────────────────────────────────┐
│   ...                                         │
└───────────────────────────────────────────────┘

┌─ Codex (independent) ────────────────────────┐
│   ...                                         │
└───────────────────────────────────────────────┘
```

### Step 5: Cross-perspective synthesis

After displaying all perspectives:

```
Synthesis
─────────

Agreement across perspectives:
  - ...

Conflicts between perspectives:
  - Developer vs Ops: ...
  - User vs Business: ...

Blind spots (not covered by selected perspectives):
  - ...

Suggested next step:
  - ...
```

### Step 6: Follow-up options
- "Want to dive deeper into one perspective?"
- "Should I run /Qdebate on the main conflict?"
- "Draft a decision document based on this analysis?"

## Will
- Run 3-6 perspectives in parallel as independent sub-agents
- Support Codex as an independent cross-model perspective
- Produce a cross-perspective synthesis highlighting agreements and conflicts
- Suggest follow-up actions

## Will Not
- Run more than 6 perspectives (noise exceeds signal)
- Mix perspectives within a single agent (defeats independence)
- Make the decision for the user
- Replace Qdebate for deep back-and-forth on a specific tradeoff
