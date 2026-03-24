# Technology Stack: QE Framework Optimization

**Project:** AI Agent Optimization (QE Framework)
**Researched:** 2025-05-13

## Recommended Stack

The QE Framework is optimized for the **Anthropic ecosystem** (Claude 3.5), leveraging its multi-tier model capabilities for latency and cost efficiency.

### Core Models (Multi-Tier)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Claude 3.5 Sonnet** | Latest | Reasoning & Synthesis | Default for complex document generation, architectural decisions, and final reviews. |
| **Claude 3.5 Haiku** | Latest | Validation & Information Gathering | **New Recommendation:** Use for `Qgenerate-spec` Step 2.5 (verification), Step 1 (info gathering), and simple task classification. |
| **Claude 3 Opus** | Latest | Complex Judgment | Reserved for high-stakes decisions where multi-agent consensus is needed. |

### Component-Specific Model Tiering (Qgenerate-spec)
| Component | Model Tier | Purpose |
|-----------|------------|---------|
| **Step 1: Info Gathering** | **Haiku** | Iterative back-and-forth for missing information. |
| **Step 2: Drafting (Docs/Analysis)** | **Haiku** | Low-complexity spec generation. |
| **Step 2: Drafting (Code/Architecture)**| **Sonnet** | High-complexity system design specs. |
| **Step 2.5: Spec Verification** | **Haiku** | S1-S5 and E1-E4 criteria checking. |
| **Step 3: Polishing & Final Approval** | **Sonnet** | Ensuring high-quality final documents. |

### Supporting Tools & Libraries
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **JSON-Schema** | Latest | Skill Argument Validation | Formalize "Skill Handoff" contracts to improve confidence. |
| **Prompt Caching** | Anthropic Native | Latency Reduction | Use for static templates and large `QE_CONVENTIONS.md`. |
| **Markdown** | N/A | Persistent State | Native format for `CLAUDE.md`, `TASK_REQUEST`, and `VERIFY_CHECKLIST`. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Verification Model | Haiku | Sonnet-only | Sonnet adds unnecessary latency and cost for deterministic rule checking (e.g., "missing extension"). |
| Agent Spawning | Workflow Logic | Sub-agent Spawning | Spawning a "Plan" agent adds initialization overhead; native workflow logic is faster. |
| Skill Handoff | JSON-Schema | Plain Text | Plain text is ambiguous and leads to "Skill Avoidance" by parent agents. |

## Installation

```bash
# Verify model access
node scripts/check-models.mjs

# Configure tiering in AGENT_TIERS.md
# Update Qgenerate-spec config to use Haiku for verification
```

## Sources

- Anthropic Model Tiering Guide (SOTA)
- `core/AGENT_TIERS.md`
- `skills/Qgenerate-spec/SKILL.md`
