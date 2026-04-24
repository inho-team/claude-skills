---
name: Qcritical-review
description: "Critical thinking verification for SIVS stages. Spawns adversarial sub-agents to stress-test specs, implementations, and merge readiness. Use for 'review critically', 'stress test this', 'devil advocate', or auto-invoked by Qgenerate-spec, Qcode-run-task, Esupervision. Distinct from Qdebate (general multi-round debate) and Qperspective (general multi-viewpoint analysis) — this is stage-aware, verdict-producing, and SIVS-integrated."
invocation_trigger: When critical verification is needed at any SIVS stage, or when the user wants adversarial review of a spec, implementation, or merge candidate.
recommendedModel: sonnet
---

# Qcritical-review — Adversarial Verification

## Role
Stress-tests artifacts at each SIVS stage through adversarial sub-agents. Produces a structured PASS/WARN/FAIL verdict. Designed to be called standalone or auto-invoked by other SIVS skills.

## CLI Interface

```
/Qcritical-review --stage spec                  # Review a spec document
/Qcritical-review --stage verify                # Review an implementation
/Qcritical-review --stage supervise             # Review merge readiness
/Qcritical-review --mode cross-model            # Use both Claude + Codex as reviewers
/Qcritical-review --stage verify --mode cross-model   # Combine stage + mode
/Qcritical-review <file>                        # Auto-detect stage from file type
/Qcritical-review                               # Auto-detect from recent SIVS context
```

## Review Modes

| Mode | Agents | When to Use |
|------|--------|-------------|
| `claude-only` (default) | 3 Claude sub-agents | Fast, low-cost reviews |
| `cross-model` | 2 Claude + 1 Codex | High-stakes reviews needing independent model perspectives |

In `cross-model` mode, the most adversarial agent per stage is routed to Codex:
- **Spec**: Edge Case Finder → Codex
- **Verify**: Devil's Advocate → Codex
- **Supervise**: Merge Blocker → Codex

This ensures the strongest critic uses a genuinely independent model, eliminating same-model confirmation bias.

## 9-Step Protocol

Each review session runs a structured sequence of up to 9 steps drawn from the OMC critic protocol. Not every SIVS stage runs all 9 steps — see the stage mapping column in the Stage Detection table below.

| # | Step | Summary |
|---|------|---------|
| 1 | Pre-commitment Prediction | Before reading, commit to 3–5 predicted problem areas |
| 2 | Multi-perspective Review | Examine through SE / Junior / Ops lenses in parallel |
| 3 | Pre-Mortem | Generate 5–7 failure scenarios assuming exact execution |
| 4 | Ambiguity Scan | Identify steps with two valid but conflicting interpretations |
| 5 | Devil's Advocate | Argue the implementation is wrong; hunt for crashes and silent failures |
| 6 | Self-audit | Re-examine each CRITICAL/MAJOR finding for confidence and bias |
| 7 | Realist Check | Pressure-test severity against realistic worst-case and mitigations |
| 8 | Adversarial Escalation | Trigger max-adversarial mode on CRITICAL findings or 3+ MAJOR |
| 9 | Explicit Gap Analysis | Catalog what is missing — requirements, assumptions, omitted context |

Full definitions (trigger conditions, output schemas, examples): [./reference/nine-step-protocol.md](./reference/nine-step-protocol.md)

## Stage Detection (when --stage is omitted)

| Stage | Detected From | 9-Step Mapping |
|-------|--------------|----------------|
| `spec` | `TASK_REQUEST*.md` or spec file | Steps 1, 2, 4, 9 (Pre-commitment, Multi-perspective, Ambiguity Scan, Gap Analysis) |
| `verify` | Source code or diff | Steps 3, 5, 6 (Pre-Mortem, Devil's Advocate, Self-audit) |
| `supervise` | PR or merge context | Steps 7, 8 (Realist Check, Adversarial Escalation) |

Detection order:
1. If a file argument is given: match against the Stage column above
2. If no argument: check `.qe/state/unified-state.json` for last SIVS stage
3. If ambiguous: ask user via `AskUserQuestion`

## Execution Procedure

### Step 1: Gather Target Artifact

| Stage | What to Read |
|-------|-------------|
| `spec` | TASK_REQUEST file, VERIFY_CHECKLIST, any referenced design docs |
| `verify` | `git diff` of implementation, test results, checklist status |
| `supervise` | Full PR diff (`git diff main...HEAD`), CI status, review comments |

### Step 2: Spawn Adversarial Agents

Spawn **3 sub-agents in parallel** via the Agent tool. Each adopts a distinct critical lens. Agents must NOT see each other's output.

#### Spec Stage Agents

| Agent | Role | Key Questions |
|-------|------|--------------|
| **Gap Hunter** | Find missing requirements | "What user scenarios are not covered? What error cases are missing? What assumptions are unstated?" |
| **Scope Critic** | Challenge scope and feasibility | "Is this over-engineered? Under-specified? Can this be built in the stated timeline?" |
| **Edge Case Finder** | Identify boundary conditions | "What happens at zero? At max? With concurrent access? With malformed input? With network failure?" |

#### Verify Stage Agents

| Agent | Role | Key Questions |
|-------|------|--------------|
| **Devil's Advocate** | Argue the implementation is wrong | "Where does this break? What input crashes it? Which test is missing?" |
| **Security Auditor** | Find vulnerabilities | "Is there injection? Auth bypass? Data leak? OWASP Top 10 exposure?" |
| **Performance Skeptic** | Challenge efficiency | "What's the time complexity? Does it scale? Are there N+1 queries? Memory leaks?" |

#### Supervise Stage Agents

| Agent | Role | Key Questions |
|-------|------|--------------|
| **Merge Blocker** | Argue against merging | "What regression risk exists? Is test coverage sufficient? Are there unresolved TODOs?" |
| **Merge Advocate** | Argue for merging | "What's the cost of delay? Is the remaining risk acceptable? Does it meet the spec?" |
| **Impartial Judge** | Weigh both sides | "Which concerns are valid? Which are hypothetical? What's the actual risk level?" |

### Step 3: Each Agent Output Format

Each agent MUST return a structured analysis:

```markdown
## [Agent Role]

### Findings
1. [Finding with severity: CRITICAL / HIGH / MEDIUM / LOW]
2. ...

### Evidence
- [Specific file:line or section reference for each finding]

### Verdict: [PASS | WARN | FAIL]
- FAIL: Found critical or high-severity issues that must be addressed
- WARN: Found medium issues worth discussing
- PASS: No significant concerns from this perspective
```

### Step 4: Aggregate Verdicts

Collect all 3 agent reports and produce a unified verdict:

```
Critical Review Report
══════════════════════

Stage: [spec | verify | supervise]
Target: [artifact name/path]

┌─ Gap Hunter ─────────────── WARN ─┐
│ 2 medium findings                  │
│ - Missing error handling for X     │
│ - No mention of concurrent access  │
└────────────────────────────────────┘

┌─ Scope Critic ───────────── PASS ─┐
│ No significant concerns            │
└────────────────────────────────────┘

┌─ Edge Case Finder ───────── FAIL ─┐
│ 1 critical finding                 │
│ - Division by zero when count = 0  │
└────────────────────────────────────┘

Overall: FAIL
Reason: 1 critical finding requires resolution before proceeding.

Action Items:
  1. [CRITICAL] Handle division by zero in calculate_average()
  2. [MEDIUM] Add error handling for timeout scenario
  3. [MEDIUM] Document concurrent access behavior
```

### Step 5: Verdict Rules

| Condition | Overall Verdict |
|-----------|----------------|
| Any agent returns FAIL | **FAIL** |
| 2+ agents return WARN | **WARN** |
| 1 agent returns WARN, rest PASS | **PASS** (with notes) |
| All agents return PASS | **PASS** |

### Step 6: Present to User

Display the full report, then ask:
- On **FAIL**: "Address the critical items before proceeding. Want me to fix them?"
- On **WARN**: "Review the warnings. Proceed anyway or address them first?"
- On **PASS**: "No critical issues found. Proceed to next stage."

## Agent Spawn Rules

1. All 3 agents run **in parallel** (single message, 3 Agent tool calls)
2. Agent prompts must include:
   - The full artifact content (spec text, diff, or PR summary)
   - Their assigned role and questions (from the stage table above)
   - The required output format
   - Instruction: "Be adversarial. Your job is to find problems, not confirm quality."
3. Agents must NOT be told what other agents are looking for

### Engine Routing per Mode

**claude-only (default):**
- All 3 agents use `subagent_type: "general-purpose"`

**cross-model:**
1. First, check Codex availability:
   ```bash
   node -e "(async()=>{const m=await import('$HOME/.claude/scripts/lib/codex_bridge.mjs');const r=await m.getCodexPluginInfo();console.log(JSON.stringify(r))})()"
   ```
2. If `installed: true`: route the designated adversarial agent to Codex via `subagent_type: "codex:codex-rescue"`
3. If `installed: false`: fall back to claude-only mode with a notice

| Stage | Codex Agent | Why This One |
|-------|------------|-------------|
| `spec` | Edge Case Finder | Boundary conditions benefit most from independent reasoning |
| `verify` | Devil's Advocate | The strongest critic should be a different model |
| `supervise` | Merge Blocker | Merge opposition must be genuinely independent |

The remaining 2 agents always use Claude sub-agents.

### Report Labeling
In cross-model mode, each agent box in the report shows the engine used:
```
┌─ Devil's Advocate [Codex] ─── FAIL ─┐
┌─ Security Auditor [Claude] ── WARN ─┐
┌─ Performance Skeptic [Claude]─ PASS ─┐
```

## Integration Points

This skill is designed to be called by other SIVS skills:

| Caller Skill | When | Stage |
|-------------|------|-------|
| `Qgenerate-spec` / `Qgs` | After spec generation | `spec` |
| `Qcode-run-task` | After verify loop passes | `verify` |
| `Esupervision-orchestrator` | Before final verdict | `supervise` |

Callers invoke via: `/Qcritical-review --stage <stage>`

## Will
- Spawn 3 adversarial sub-agents per stage
- Produce structured PASS/WARN/FAIL verdict with evidence
- Run agents in parallel for speed
- Adapt critical lens to SIVS stage

## Will Not
- Replace Qdebate for open-ended topic debates
- Replace Qperspective for general multi-viewpoint analysis
- Auto-fix issues (only identify and report)
- Run more than 3 agents (focused critique over broad coverage)

## Attribution

9-Step Protocol adapted from oh-my-claudecode (MIT, © 2025 Yeachan Heo): https://github.com/Yeachan-Heo/oh-my-claudecode/blob/main/agents/critic.md
