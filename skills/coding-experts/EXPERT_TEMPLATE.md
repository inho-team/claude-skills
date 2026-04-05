# Expert Template — Coding Experts Refactoring Standard

> This template defines the mandatory structure for all coding-expert SKILL.md files.
> Used by Wave 1.2~1.5 to ensure consistency across 71 experts.
> Maximum file length: 250 lines.

## SKILL.md Structure Overview

### Frontmatter (lines 1-16)

```yaml
---
name: Q{expert-name}
description: "{Language/Framework} expert. {1-2 sentence scope covering key use cases}."
license: MIT
metadata: 
author: "{GitHub URL or name}"
version: 1.1.0
domain: {backend|frontend|data|devops|tools}
triggers: "{Comma-separated trigger terms: Language, Framework, Common phrases}"
role: specialist
scope: implementation
output-format: code
related-skills: {comma-separated related expert names}
invocation_trigger: "When {language/framework/domain} best practices are needed."
recommendedModel: haiku
---
```

**Frontmatter Rules:**
- `name`: Must start with `Q` (e.g., `Qnestjs-expert`, `Qfastapi-expert`)
- `description`: 1-2 sentences, concrete trigger contexts (not generic)
- `triggers`: 6-10 terms, include framework name, language, common phrases, and pain points
- `domain`: One of: `backend`, `frontend`, `data`, `devops`, `tools`
- `recommendedModel`: Always `haiku` (Haiku agents execute refactored experts)
- `version`: Start at `1.1.0` (experts inherit previous versions)

---

## Section Layout (lines 18-250)

| Section | Lines | Content | Max Words |
|---------|-------|---------|-----------|
| **Title & Intro** | 18-22 | Expert name, 1-line role summary | 30 |
| **Core Workflow** | 23-40 | 4-6 sequential steps with validation checkpoints | 200 |
| **Reference Guide** | 41-60 | Table linking 5-7 topics to reference files | 150 |
| **Code Examples** | 61-140 | 3-4 realistic patterns (basic, intermediate, advanced) with comments | 500 |
| **Constraints** | 141-170 | MUST DO (5-8 rules) + MUST NOT DO (5-8 rules) | 300 |
| **Output Templates** | 171-180 | Checklist of what to deliver for different scenarios | 150 |
| **Knowledge Reference** | 181-250 | Full list of technologies, frameworks, tools relevant to expert | 500 |

---

## Section-by-Section Guidance

### Title & Intro (3-5 lines)

```markdown
# {Framework/Language} Expert

Senior {framework/language} specialist with deep expertise in [specific niche].
```

**Goal:** Establish expertise credibility in one sentence. Example:
- "NestJS Expert — Senior NestJS specialist with deep expertise in enterprise-grade, scalable TypeScript backend applications."
- Not: "TypeScript Expert" (too broad)

---

### Core Workflow (4-6 steps, ~200 words)

Describe the **step-by-step process** this expert follows. Each step should:
1. Have a verb (Analyze, Design, Implement, Verify, Test)
2. Include a success criterion or checkpoint
3. Reference validation (linting, testing, or runtime check)

**Template:**

```markdown
## Core Workflow

1. **Analyze requirements** — [Identify key entities/components]
2. **Design structure** — [Plan module/file organization]
3. **Implement** — [Create code with specific CLI/tool mentions]
4. **Secure** — [Add auth, validation, error handling]
5. **Verify** — [Run linter, type checker: `npm run lint`, `cargo check`, etc.]
6. **Test** — [Write unit/integration tests; verify via CLI command]

> **Checkpoint:** [Key assertion that code is correct before proceeding]
```

**Good Checkpoint Examples:**
- "Run `npm run test` and confirm all tests pass before merging."
- "Verify OpenAPI docs at `/docs` reflect the intended API surface."
- "Confirm `cargo clippy` reports no warnings and `cargo test --all` passes."

---

### Reference Guide (5-7 topics, small table)

**Goal:** Point the expert to detailed reference files without bloating the main SKILL.md.

**Template:**

```markdown
## Reference Guide

Load detailed guidance based on context:

| Topic | Reference | Load When |
|-------|-----------|-----------|
| {topic} | `references/{topic}.md` | When doing X, use this reference |
| {topic} | `references/{topic}.md` | When doing Y, use this reference |
```

**Example (FastAPI):**

```markdown
| Pydantic V2 | `references/pydantic-v2.md` | Creating schemas, validation, model_config |
| SQLAlchemy | `references/async-sqlalchemy.md` | Async database, models, CRUD operations |
| Authentication | `references/authentication.md` | JWT, OAuth2, get_current_user |
```

**Rules:**
- 5-7 rows (not more—keep scope manageable)
- Each reference file must exist in `references/` subdirectory
- Describe **when** to load, not just the topic
- Max 1 file per row

---

### Code Examples (3-4 examples, ~500 words, 80+ lines total)

Provide **realistic, runnable code snippets** showing:
1. **Basic pattern** — Minimal viable example
2. **Intermediate pattern** — With error handling
3. **Advanced pattern** — With optional features (testing, security, advanced config)

**Template for Each Example:**

````markdown
### {Pattern Name}

```{language}
// Brief comment explaining what this code does
// Include imports and realistic context

[10-20 lines of working code]
[Include error handling, validation, or type hints]
[Show language-specific idioms (decorators, annotations, etc.)]
```
````

**Requirements:**
- All code must be syntactically valid and runnable
- Include realistic imports and dependencies
- Show comments explaining non-obvious lines
- Avoid placeholder code (no `[...]` or truncated logic)
- Each example should demonstrate a different aspect of the expert's domain

**Example: NestJS Controller Pattern**
```typescript
// create-user.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

---

### Constraints — MUST DO / MUST NOT DO (5-8 each, ~300 words)

**Goal:** Codify non-negotiable rules for this expert.

**Template:**

```markdown
## Constraints

### MUST DO
- [Rule 1 — specific, actionable] — [context or why]
- [Rule 2 — specific, actionable]
- ... (5-8 rules total)

### MUST NOT DO
- [Anti-pattern 1 — specific bad practice]
- [Anti-pattern 2 — specific bad practice]
- ... (5-8 rules total)
```

**Rules Should Be:**
- Specific (e.g., "Use constructor injection" not "Use dependency injection")
- Actionable (e.g., "Never hardcode secrets in source files" not "Be careful about secrets")
- Framework-specific (apply MUST DO/NOT rules that differentiate this expert from others)

**Example (NestJS):**

```markdown
### MUST DO
- Use `@Injectable()` and constructor injection for all services
- Validate all inputs with `class-validator` decorators on DTOs
- Throw typed HTTP exceptions (`NotFoundException`, `ConflictException`, etc.)
- Document all endpoints with `@ApiTags`, `@ApiOperation` decorators
- Write unit tests for every service method using `Test.createTestingModule`

### MUST NOT DO
- Expose passwords, secrets, or internal stack traces in responses
- Accept unvalidated user input — always apply `ValidationPipe`
- Use `any` type unless absolutely necessary
- Hardcode hostnames, ports, or credentials in source files
```

---

### Output Templates (1-2 checklists, ~150 words)

**Goal:** Tell implementers what to deliver and in what order.

**Template:**

```markdown
## Output Templates

When implementing a {feature type}, provide in this order:
1. [File/Component type 1] — [Why/what it covers]
2. [File/Component type 2] — [Why/what it covers]
3. [File/Component type 3] — [Why/what it covers]
4. [Optional: Test file type] — [Coverage target]
5. [Optional: Configuration/Documentation]
```

**Example (NestJS):**

```markdown
## Output Templates

When implementing a NestJS feature, provide in this order:
1. Module definition (`.module.ts`) — Declare controllers, services, imports
2. Controller with Swagger decorators (`.controller.ts`) — Define endpoints
3. Service with typed error handling (`.service.ts`) — Implement business logic
4. DTOs with `class-validator` decorators (`dto/*.dto.ts`) — Define request/response shapes
5. Unit tests for service methods (`*.service.spec.ts`) — Verify business logic
```

---

### Knowledge Reference (full taxonomy, ~500 words)

**Goal:** Comprehensive list of all concepts, tools, frameworks, libraries this expert touches.

**Template:**

```markdown
## Knowledge Reference

{Framework/Language}, {ORM/Database}, {Testing}, {Auth}, {Other tool 1}, {Other tool 2}, ...
```

**Should Include:**
- Primary language/framework
- Common ORMs, database libraries
- Testing frameworks
- Authentication libraries
- API documentation tools
- Validation/serialization libraries
- Async/concurrency tools
- Monitoring/logging libraries
- Build/deployment tools

**Example (FastAPI):**

```markdown
## Knowledge Reference

FastAPI, Pydantic V2, async SQLAlchemy, Alembic migrations, JWT/OAuth2, pytest-asyncio, httpx, BackgroundTasks, WebSockets, dependency injection, OpenAPI/Swagger
```

---

## references/ Directory Structure

Each expert may have these optional reference files:

```
skills/coding-experts/{domain}/{expert-name}/
├── SKILL.md                              (required, ~250 lines)
├── references/
│   ├── {topic-1}.md                      (extended patterns, ~200-300 lines)
│   ├── {topic-2}.md
│   ├── {topic-3}.md
│   ├── {topic-4}.md
│   └── {topic-5}.md                      (max 5 reference files)
```

**Reference File Rules:**
- Max 5 reference files per expert (keep scope bounded)
- Each reference file: ~200-300 lines (deep dives, examples, comparison tables)
- Reference file should NOT duplicate SKILL.md content—extend it
- File names use kebab-case and match the "Reference Guide" table

**Reference File Template:**

```markdown
# {Topic} — {Expert Name}

> Detailed guide for {specific aspect of the expert's domain}.
> Referenced from SKILL.md when implementing {feature type}.

## Overview
[1-paragraph explanation of why this topic matters]

## When to Use This Guide
- Scenario 1
- Scenario 2
- Scenario 3

## Key Concepts
[Section with subsections covering the topic in depth]

## Examples
[3-4 working examples]

## Best Practices
[5-10 recommendations specific to this topic]

## Common Pitfalls
[3-5 mistakes and how to avoid them]

## Related Concepts
[Links to other reference files or SKILL.md sections]
```

---

## Refactoring Checklist (for Wave Agents)

Use this checklist when refactoring an existing expert:

- [ ] **Frontmatter**: Audit lines 1-16 for accuracy (name, description, triggers, domain)
- [ ] **Title & Intro**: Lines 18-22, clear role statement in one sentence
- [ ] **Core Workflow**: Lines 23-40, 4-6 steps with validation checkpoints
- [ ] **Reference Guide**: Lines 41-60, 5-7 topics with clear "Load When" conditions
- [ ] **Code Examples**: Lines 61-140, 3-4 realistic patterns (basic, intermediate, advanced)
  - [ ] All code is syntactically valid for the target language
  - [ ] All code includes realistic imports and context
  - [ ] Comments explain non-obvious lines
  - [ ] No placeholder code (`[...]`, truncated logic)
- [ ] **Constraints**: Lines 141-170, MUST DO (5-8) + MUST NOT DO (5-8)
  - [ ] All constraints are specific and actionable
  - [ ] Constraints are framework-specific (not generic)
- [ ] **Output Templates**: Lines 171-180, checklist of deliverables with order
- [ ] **Knowledge Reference**: Lines 181-250, comprehensive technology list
- [ ] **Line Count**: ~250 lines max
- [ ] **references/ Directory**: 
  - [ ] Max 5 reference files
  - [ ] Each reference file exists and is ~200-300 lines
  - [ ] Reference files match the "Reference Guide" table
  - [ ] Reference files extend (not duplicate) SKILL.md

---

## Examples: How Different Experts Use This Template

### Backend Expert (FastAPI)

```
name: Qfastapi-expert
domain: backend
Reference Guide: Pydantic V2, SQLAlchemy, Endpoints, Authentication, Testing, Django Migration
Code Examples: Schema + endpoint, Async CRUD, JWT flow
Constraints: Use type hints, async/await, Pydantic V2 syntax (MUST DO)
  Avoid: Sync I/O, Pydantic V1, hardcoded config (MUST NOT DO)
```

### Frontend Expert (React)

```
name: Qreact-expert
domain: frontend
Reference Guide: Hooks, State Management, Form Handling, Testing, TypeScript
Code Examples: Functional component with hooks, Custom hook, Error boundary
Constraints: Use functional components, declare dependencies properly (MUST DO)
  Avoid: Class components, missing dependency arrays (MUST NOT DO)
```

### Data Expert (ML Pipeline)

```
name: Qml-pipeline
domain: data
Reference Guide: Feature Engineering, Model Validation, Experiment Tracking, Pipeline Orchestration
Code Examples: Training pipeline, Validation loop, Hyperparameter grid search
Constraints: Log metrics, validate on holdout set, document assumptions (MUST DO)
  Avoid: Data leakage, hardcoding hyperparameters (MUST NOT DO)
```

---

## Summary

This template ensures **consistency**, **discoverability**, and **usability** across 71 coding experts:

1. **Frontmatter** (16 lines) — Metadata for routing and discovery
2. **Title & Intro** (5 lines) — Clear value proposition
3. **Core Workflow** (18 lines) — Step-by-step guidance with checkpoints
4. **Reference Guide** (20 lines) — Table pointing to extended resources
5. **Code Examples** (80 lines) — Realistic, runnable patterns
6. **Constraints** (30 lines) — MUST DO and MUST NOT DO rules
7. **Output Templates** (10 lines) — What to deliver
8. **Knowledge Reference** (70 lines) — Complete technology taxonomy
9. **references/ Directory** — Max 5 extended reference files per expert

**Total: ~250 lines per SKILL.md + optional references/**

Use this template for all refactoring in Wave 1.2~1.5. Questions? Check `.qe/planning/DECISION_LOG.md`.
