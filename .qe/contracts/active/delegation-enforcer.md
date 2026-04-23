# Contract: delegation-enforcer

PreToolUse hook integration: checks whether an agent tool invocation should route through E-agent delegation based on agent recommendation metadata. Maintains counters for auto-injections, warnings, and overrides to track delegation decisioning patterns.

## Signature

```ts
interface AgentToolInput {
  agent?: string;
  agentName?: string;
  name?: string;
  model?: string;
  modelName?: string;
}

interface DelegationResult {
  action: 'allow' | 'inject' | 'warn';
  model: string | null;
  message: string;
}

interface DelegationStats {
  overrides: number;
  autoInjections: number;
  warnings: number;
}

export function getAgentRecommendedModel(
  cwd: string,
  agentName: string
): string | null;

export function checkDelegation(
  cwd: string,
  toolInput: AgentToolInput
): DelegationResult;

export function updateDelegationStats(
  state: object,
  action: 'inject' | 'warn' | 'allow'
): void;
```

## Purpose

Route agent tool invocations through optional model recommendations extracted from agent frontmatter (recommendedModel). When an agent specifies a recommended model, delegation-enforcer compares the caller-provided model against the recommendation using tier hierarchy (haiku < sonnet < opus) and decides whether to auto-inject, allow, or warn. Maintains cumulative stats on model override patterns to inform cost and capability decisions.

## Constraints

- Agent file resolution: searches `agents/{name}.md` or `agents/{name}/AGENT.md` (relative to cwd); returns null if not found
- Frontmatter parsing: only extracts `---\nkey: value\n---` YAML syntax; skips malformed content
- Model tier hierarchy: ['haiku', 'sonnet', 'opus'] (case-insensitive, substring match); unknown models return -1 tier index
- toolInput agent name sources (in precedence): `agent`, `agentName`, `name` fields; empty string if none provided
- Model sources in toolInput: `model`, `modelName` fields
- Delegation action rules:
  - If no recommendedModel → action='allow', no intervention
  - If no specified model → action='inject' recommended model
  - If specified tier < recommended tier → action='allow' (cost saving intentional)
  - If specified tier === recommended tier → action='allow'
  - If specified tier > recommended tier → action='warn' (cost overage flag)
- Cannot determine tier (getTierIndex = -1) → action='allow' (defer to caller)
- I/O: readFileSync only on agent file; no state modification except updateDelegationStats

## Invariants

- getTierIndex is stable for a given model string (deterministic)
- DelegationStats structure: always has overrides, autoInjections, warnings keys (initialized to 0 if missing)
- updateDelegationStats('inject') increments autoInjections; ('warn') increments both warnings and overrides; ('allow') increments nothing
- message field always populated for 'inject' and 'warn' actions; always empty string for 'allow'
- Agent file resolution does not throw; returns null gracefully on ENOENT, syntax errors
- checkDelegation never throws; missing agent, missing frontmatter, or parse errors default to action='allow'
- Tier comparison logic: if either tier index is -1, action='allow' (unknown tier treated as permissive)

## Error Modes

```ts
// getAgentRecommendedModel: never throws
// Returns null on: agent file not found, no frontmatter, no recommendedModel key, read error
// Returns string on: valid recommendedModel value in frontmatter

// checkDelegation: never throws
// Always returns { action, model, message } regardless of input shape or file I/O errors
// toolInput with missing/falsy agent name → { action: 'allow', model: null, message: '' }
// Unresolvable model tiers → { action: 'allow', model: <specified>, message: '' }

// updateDelegationStats: mutates state.delegationStats in place
// If state.delegationStats does not exist, creates { overrides: 0, autoInjections: 0, warnings: 0 }
// Invalid action values (not 'inject'|'warn'|'allow') are silently ignored (no mutation)
```

## Notes

테스트 커버리지 갭: `hooks/scripts/lib/__tests__/delegation-enforcer.test.mjs`는 현재 존재하지 않음. Convention-path 테스트 파일이 없으므로 unit/integration 커버리지가 미완료 상태.
