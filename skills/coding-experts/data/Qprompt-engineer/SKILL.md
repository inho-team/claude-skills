---
name: Qprompt-engineer
description: Writes, refactors, and evaluates prompts for LLMs — generating optimized prompt templates, structured output schemas, evaluation rubrics, and test suites. Use when designing prompts for new LLM applications, refactoring existing prompts for better accuracy or token efficiency, implementing chain-of-thought or few-shot learning, creating system prompts with personas and guardrails, building JSON/function-calling schemas, or developing prompt evaluation frameworks to measure and improve model performance.
license: MIT
metadata: 
author: "https://github.com/Jeffallan"
version: 1.1.0
domain: data-ml
triggers: prompt engineering, prompt optimization, chain-of-thought, few-shot learning, prompt testing, LLM prompts, prompt evaluation, system prompts, structured outputs, prompt design
role: expert
scope: design
output-format: document
related-skills: test-master
invocation_trigger: When specialized language or framework best practices are needed.
recommendedModel: haiku
---

# Prompt Engineer

Expert prompt engineer specializing in designing, optimizing, and evaluating prompts that maximize LLM performance across diverse use cases.

## Core Workflow

1. **Understand** — Define task, success criteria, constraints, edge cases
2. **Design** — Choose pattern (zero-shot, few-shot, CoT), write clear instructions
3. **Test & Evaluate** — Run diverse test cases, measure quality metrics
   - **Checkpoint:** If accuracy < 80%, identify failure patterns before iterating
4. **Iterate** — Make one change at a time; refine based on failures, reduce tokens
5. **Document & Deploy** — Version prompts, document behavior, monitor production

## Code Patterns (3 Examples with Docstrings)

```python
# Pattern 1: Few-shot template with format validation
def few_shot_prompt_with_validation(user_input: str, examples: list[dict]) -> str:
    """Build few-shot prompt with automatic format validation."""
    prompt = "Classify sentiment as Positive, Negative, or Neutral.\n\n"
    for ex in examples:
        prompt += f"Input: {ex['input']}\nOutput: {ex['output']}\n\n"
    prompt += f"Input: {user_input}\nOutput:"
    assert len(prompt) < 4000, "Prompt exceeds token limit"
    return prompt

# Pattern 2: Chain-of-thought with step validation
def cot_prompt_template(problem: str, step_count: int = 5) -> str:
    """Generate CoT prompt enforcing explicit step decomposition."""
    prompt = f"{problem}\n\nSolve step-by-step:\n"
    for i in range(1, step_count + 1):
        prompt += f"Step {i}: [reasoning]\n"
    prompt += "Final Answer: [answer]\n"
    return prompt

# Pattern 3: Structured output with JSON schema validation
def structured_output_prompt(task: str, schema: dict) -> tuple[str, str]:
    """Generate prompt enforcing JSON output with schema validation."""
    import json
    prompt = f"{task}\n\nRespond in valid JSON matching this schema:\n{json.dumps(schema)}"
    return prompt, json.dumps(schema)
```

## Comment Template (Google-style)

```python
def design_system_prompt(role: str, task: str, constraints: list):
    """One-line prompt design objective.
    
    Longer: task context, target model version, output format, evaluation criteria.
    
    Args:
        role: Role/persona (e.g., 'helpful assistant')
        task: Task description (e.g., 'summarize articles')
        constraints: List of constraints (e.g., ['max 100 words', 'bullet format'])
    
    Returns:
        System prompt string
    """
```

## Lint Rules (ruff/mypy/black)

```toml
[tool.ruff]
line-length = 100
select = ["E", "F", "W"]

[tool.black]
line-length = 100
target-version = ['py39']
```

Violations: F841 (unused test cases), E501 (long prompts), W291 (trailing space)

## Security Checklist (5+)

1. **Prompt injection via user input** — Validate & sanitize inputs; use delimiters, guardrails
2. **Data exfiltration** — Set output length limits; prevent enumeration attacks
3. **Jailbreak via prompt override** — Use clear delimiters, refusal patterns, integrity checks
4. **PII in examples** — Use synthetic/anonymized examples; never include real emails, SSNs, keys
5. **Model-specific output exploitation** — Version-pin prompts; test across model versions before rollout

## Anti-patterns (5 Wrong/Correct)

| Anti-pattern | Fix |
|--------------|-----|
| "Summarize this." (vague) | "Summarize in 3 bullets, ≤15 words each, start with action verb" |
| Few-shot examples contradicting instructions | Align examples to instructions; test examples before deploy |
| No output format specification | Specify: "Respond in JSON: {`category`: string, `confidence`: 0–1}" |
| Single prompt version; no A/B testing | Version in Git; test across GPT-4, Claude, Gemini before rollout |
| No evaluation on test cases before prod | Build test suite (≥20 cases); require ≥85% accuracy before deploy |

## Quick Patterns

**Zero-shot baseline:**
```
Classify sentiment: Positive, Negative, or Neutral.
Review: {{review}}
Sentiment:
```

**Few-shot improved:**
```
Classify sentiment: Positive, Negative, or Neutral.

Example 1: "Great product!" → Positive
Example 2: "Broken on arrival" → Negative
Example 3: "It's okay" → Neutral

Review: {{review}}
Sentiment:
```

**Chain-of-thought:**
```
Solve step-by-step, explaining your reasoning at each step.
Problem: {{problem}}
Step 1: ...
Step 2: ...
Final Answer:
```

## MUST DO / MUST NOT DO

**MUST:** Test with diverse inputs, measure accuracy, version prompts, document limitations, validate output formats  
**MUST NOT:** Deploy unvetted prompts, use contradictory examples, hardcode secrets in prompts, ignore edge cases, assume perfect transfer across models
