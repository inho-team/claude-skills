---
name: Qmap-codebase
description: "Automated codebase analysis for brownfield projects. Spawns 4 parallel agents to map stack, architecture, quality, and concerns."
invocation_trigger: "When onboarding to an existing project, starting work on unfamiliar code, or running /Qmap-codebase."
user_invocable: true
recommendedModel: sonnet
---


# Qmap-codebase -- Parallel Codebase Analysis

## Role
A skill that rapidly maps an unfamiliar or brownfield codebase by spawning 4 parallel Teammate agents. Each agent analyzes a distinct dimension of the project and writes its findings to `.qe/analysis/`. The Lead then synthesizes a single executive summary.

## Why Use This
- **Fast onboarding**: Understand any codebase in one pass instead of manual exploration.
- **Parallel speed**: 4 agents run concurrently -- wall-clock time is bounded by the slowest agent, not the sum.
- **Structured output**: All findings land in `.qe/analysis/` where every other QE skill expects them.
- **Token savings**: Future skills read the analysis files instead of re-scanning the repo.

## Pre-Checks

1. Verify QE framework is initialized (CLAUDE.md or equivalent exists at project root). If not, instruct user to run `/Qinit` first.
2. Check if `.qe/analysis/` already contains output files (`stack-profile.md`, `architecture-map.md`, `quality-report.md`, `concerns-report.md`). If any exist, ask the user before overwriting. In Utopia mode, overwrite without asking.

## Execution Procedure

### Step 1: Spawn 4 Parallel Teammates

Launch all 4 agents in a **single Agent tool call block** so they run concurrently.

#### Agent 1 -- Stack Mapper (haiku)
**Goal**: Identify the technology stack, language versions, and dependency landscape.
**Instructions**:
- Use Glob to find: `package.json`, `requirements.txt`, `Pipfile`, `pyproject.toml`, `go.mod`, `Gemfile`, `Cargo.toml`, `pom.xml`, `build.gradle`, `*.csproj`, `composer.json`, `Makefile`, `Dockerfile`, `docker-compose.*`
- Read each manifest and extract: language, runtime version, framework, key dependencies (top 15 by importance), dev tooling (bundler, linter, formatter, test runner)
- Write results to `.qe/analysis/stack-profile.md`

**Output format**:
```
# Stack Profile
## Language & Runtime
## Frameworks
## Key Dependencies (top 15)
## Dev Tooling
## Build & Package
```

#### Agent 2 -- Architecture Mapper (sonnet)
**Goal**: Map the high-level architecture, module boundaries, and data flow.
**Instructions**:
- Use Glob to survey top-level directory structure (depth 2)
- Identify entry points: `main.*`, `index.*`, `app.*`, `server.*`, `src/`
- Identify module boundaries: packages, namespaces, feature folders
- Look for config files that reveal architecture: routing, DI containers, middleware
- Read key entry point files (first 80 lines) to understand bootstrap flow
- Write results to `.qe/analysis/architecture-map.md`

**Output format**:
```
# Architecture Map
## Directory Structure (depth 2)
## Entry Points
## Module Boundaries
## Data Flow (inferred)
## Key Patterns (MVC, microservices, monorepo, etc.)
```

#### Agent 3 -- Quality Mapper (haiku)
**Goal**: Assess testing, linting, CI/CD, and code health indicators.
**Instructions**:
- Use Glob to find: `jest.config.*`, `vitest.config.*`, `pytest.ini`, `.eslintrc*`, `.prettierrc*`, `tsconfig.json`, `.github/workflows/*`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/*`, `codecov.yml`, `sonar-project.properties`
- Count test files: `**/*.test.*`, `**/*.spec.*`, `**/*_test.*`, `test/**`, `tests/**`, `__tests__/**`
- Read CI config to understand pipeline stages
- Write results to `.qe/analysis/quality-report.md`

**Output format**:
```
# Quality Report
## Test Infrastructure
  - Framework:
  - Test file count:
  - Test directories:
## Linting & Formatting
## CI/CD Pipeline
## Type Safety
## Coverage Configuration
```

#### Agent 4 -- Concerns Mapper (sonnet)
**Goal**: Surface technical debt, security risks, and maintenance concerns.
**Instructions**:
- Grep for: `TODO`, `FIXME`, `HACK`, `XXX`, `DEPRECATED`, `@deprecated` (count and sample top 10)
- Grep for: `console.log`, `debugger`, `binding.pry`, `import pdb` (debug artifacts)
- Check for: `.env.example` (env var management), `.nvmrc`/`.node-version`/`.tool-versions` (version pinning)
- Read lock files age via git log (last modified date)
- Look for known vulnerable patterns: `eval(`, `dangerouslySetInnerHTML`, `innerHTML =`, raw SQL concatenation
- Write results to `.qe/analysis/concerns-report.md`

**Output format**:
```
# Concerns Report
## Technical Debt
  - TODO/FIXME count:
  - Top 10 samples:
## Debug Artifacts
## Dependency Health
  - Lock file last updated:
  - Version pinning:
## Security Signals
## Recommendations (top 5)
```

### Step 2: Synthesize

After all 4 agents complete, the Lead reads all output files and creates:

**`.qe/analysis/codebase-summary.md`** -- a one-page executive summary:

```
# Codebase Summary
Generated: {date}

## Overview
One paragraph: what this project is, primary language/framework, rough size.

## Stack Snapshot
Key technologies in a compact table.

## Architecture at a Glance
2-3 sentence description of the architecture pattern and module layout.

## Health Score
Simple assessment: Testing (Good/Fair/Poor), CI (Yes/No), Linting (Yes/No), Type Safety (Yes/No).

## Top Concerns
Bulleted list of the 3-5 most important findings from the Concerns Report.

## Recommended Next Steps
What the developer should investigate or fix first.
```

### Step 3: Display Summary

Print the executive summary to the user with key findings highlighted. If any dimension reported critical issues (no tests, no CI, security signals), call them out explicitly.

## Will
- Spawn 4 parallel read-only analysis agents
- Write structured findings to `.qe/analysis/`
- Synthesize a one-page executive summary
- Display results to user

## Will Not
- Modify any source code
- Run build or test commands
- Make git operations
- Overwrite existing analysis without confirmation (unless Utopia mode)

## Handoff
After displaying the summary, suggest next steps:
- If concerns are critical: suggest `/Qsystematic-debugging` or manual review
- If architecture is complex: suggest `/Qplan` for phased onboarding
- If quality is poor: suggest `/Qtest-driven-development` to add coverage
- Default: suggest `/Qrefresh` to keep analysis current as work progresses
