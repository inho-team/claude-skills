---
name: Qinit
description: QE framework (Query Executor) initial setup. Creates CLAUDE.md, settings.json, directory structure, and .gitignore in a new project, then auto-analyzes the project. Use when the user wants to initialize a project or set up the framework.
invocation_trigger: When framework initialization, maintenance, or audit is required.
recommendedModel: haiku
---

# Qinit — QE Framework Initialization

## Role
A skill that sets up the QE framework base structure in a new project and auto-analyzes it.
Run once only; do not run on a project that is already set up.

## Pre-check
Before running, verify whether `CLAUDE.md` exists in the project root.
- **If it does not exist**: Proceed with initialization (Step 0).
- **If it exists**: Run migration check (Step M) instead of exiting.

### Step M: CLAUDE.md Migration
When `CLAUDE.md` already exists, check if it contains the `## QE 툴킷` section.
- **If the section exists**: Display "QE framework is already up to date." then exit.
- **If the section is missing**: Migrate the existing CLAUDE.md.
  1. Read the existing CLAUDE.md content.
  2. Read the `base.md` template and extract the `## QE 툴킷` section (from that heading to `## Task Log`).
  3. If the existing CLAUDE.md has a `## Task Log` section, insert the QE 툴킷 section **before** it.
  4. If not, append the QE 툴킷 section at the end.
  5. Also ensure `## Task Log` with `.qe/TASK_LOG.md` reference exists; add if missing.
  6. Show diff preview to user via `AskUserQuestion` before applying.
  7. Report: "CLAUDE.md migrated — QE 툴킷 section added."

## Step 0: Acquire .qe/ Permissions

Before starting initialization, obtain read/write/delete permissions for all files under `.qe/`.
- All file creation, modification, and deletion under `.qe/` is **performed automatically without user confirmation**.
- This is the QE framework data area and requires no separate approval.
- Files outside `.qe/` (CLAUDE.md, .gitignore, etc.) still require user confirmation as usual.

## Initialization Procedure

### Step 1: Collect Project Information
Ask the user for the minimum required information:
- **Project name**: Required
- **Project description**: One-line summary
- **Tech stack**: Primary languages/frameworks (optional)

### Step 2: Auto-analyze Project
Delegate the analysis to the `Erefresh-executor` sub-agent. Since Erefresh-executor uses the same analysis logic as Qrefresh, consistency of analysis is guaranteed.

Scan project sources and save analysis results to `.qe/analysis/`.

#### Analysis Targets and Output Files

| Output File | Analysis Content | Scan Method |
|-------------|-----------------|-------------|
| `project-structure.md` | Directory tree, key file list, file count/language ratio | Use `ls`, `Glob` to understand structure |
| `tech-stack.md` | Languages, frameworks, dependencies, version info | Parse `package.json`, `pom.xml`, `build.gradle`, `requirements.txt`, `go.mod`, `Cargo.toml`, etc. |
| `entry-points.md` | Main entry points, API endpoints, routes, CLI commands | Search `main`, `app`, `index`, `server` files + pattern search for `@Controller`, `@Route`, `router`, etc. |
| `architecture.md` | Layer structure, inter-module relationships, design patterns | Analyze directory naming conventions (`controller/`, `service/`, `repository/`, etc.) + track import/require relationships |

#### Analysis Rules
- Analysis is **read-only** — do not modify source code.
- If there are too many files, summarize focusing on top-level structure (1000+ files).
- If the project is empty (no source files), skip the analysis step and create empty analysis files.
- Record the creation timestamp at the top of each analysis file.

### Step 3: Create Files
Create the following files and directories:

#### CLAUDE.md Template Selection

Use `templates/claude-md/base.md` as the primary template. It contains conditional sections marked with `<!-- if: type -->` / `<!-- end: type -->` comments. Detect the project type, then include only the matching conditional sections.

| Project Type | Sections to Include | When to Use |
|-------------|-------------------|-------------|
| `minimal` | Core only (Overview, Tech Stack, Constraints, Task List) | Single-purpose project, few files, no build system |
| `standard` | Core + Build & Run, Project Structure, Goals | Single app with build/test pipeline (default) |
| `fullstack` | Core + standard sections + Frontend/Backend/Database subsections, API Endpoints, Environment Variables | Separate frontend + backend + database |
| `monorepo` | Core + standard sections + Packages table, Build Order, Shared Dependencies | Multiple packages/apps in one repository |

Conditional markers: `<!-- if: standard+ -->` applies to standard, fullstack, and monorepo. Type-specific markers (e.g., `<!-- if: fullstack -->`) apply only to that type.

Detection heuristics:
- **monorepo**: `workspaces` in package.json, `pnpm-workspace.yaml`, `lerna.json`, or `nx.json` exists
- **fullstack**: Separate `frontend/` + `backend/` directories, or both a UI framework and a server framework detected
- **minimal**: Fewer than 10 source files, no package manager config
- **standard**: Everything else (default)

> Legacy templates (`minimal.md`, `standard.md`, `fullstack.md`, `monorepo.md`) are retained for backward compatibility but `base.md` is the preferred template going forward.

#### CLAUDE.md
Generate using the selected template from `templates/claude-md/`.
Also reference `QE_CONVENTIONS.md` (project root) for QE rules (file naming, task status, completion criteria) and add a reference line in the generated CLAUDE.md pointing to it.
- Fill in project name and description
- Reflect tech stack from Step 2 analysis results
- Leave goals, constraints, and decisions empty
- Create an empty table for the task list

#### .claude/settings.json
```json
{
  "env": {
    "SLASH_COMMAND_TOOL_CHAR_BUDGET": "100000"
  }
}
```
Sets the character budget for slash command tool descriptions so all skills fit within the system prompt.

#### Directory Structure
```
.qe/
├── analysis/
│   ├── project-structure.md
│   ├── tech-stack.md
│   ├── entry-points.md
│   └── architecture.md
├── agent-results/
├── agent-triggers/
├── .archive/
├── context/
├── profile/
├── tasks/
│   └── pending/
└── checklists/
    └── pending/
```
Created with `mkdir -p`.

#### Multi-Model Orchestration Scaffolding (Opt-in)
Only run this block when the user explicitly wants multi-model or hybrid orchestration. Confirm via `AskUserQuestion` (yes/no) before touching `.qe/ai-team/`.

Before seeding the config, ask how the user wants to map **roles to runner instances**.
- Do not ask only for provider names.
- A runner is a named execution slot with its own provider, model, command, and timeout.
- Multiple roles may reuse the same runner.
- The same provider may appear in multiple runners, such as `claude_planner`, `claude_reviewer`, and `claude_supervisor`.

Recommended presets to offer:
- `Claude + Codex + Gemini`
- `All Claude`
- `Custom`

If the user picks `All Claude`, still create distinct runners by default:
- `claude_planner`
- `claude_implementer`
- `claude_reviewer`
- `claude_supervisor`

If the user picks `Custom`, collect for each role:
- runner name
- provider
- model
- executable path
- argument template
- timeout

Then build `roles.{role}.runner` plus the matching `runners.{runnerName}` entries.

1. **Create directories**
   ```text
   .qe/ai-team/
     config/
     artifacts/
     runs/
   ```
   Never create these folders in single-model setups.

2. **Seed `team-config.json`**
   - Copy `templates/ai-team/team-config.json` into `.qe/ai-team/config/team-config.json`.
   - Rewrite the template so it matches the user's chosen role-to-runner mapping before validation.
   - Immediately run `node scripts/validate_ai_team_config.mjs .qe/ai-team/config/team-config.json` and show the pass/fail result to the user.
   - If validation fails, fix the template first; do not leave an invalid config on disk.

3. **Planner artifact placeholders** (planner-owned, do not pre-fill scope):
   - `.qe/ai-team/artifacts/role-spec.md` with headings `# Role Spec`, `## Objective`, `## Scope`, `## Constraints`, `## Acceptance Criteria`, `## Execution Notes`.
   - `.qe/ai-team/artifacts/task-bundle.json` containing `{ "tasks": [] }`.

4. **Execution artifacts** (owned by downstream roles, start empty but present so automation can append):
   - `.qe/ai-team/artifacts/implementation-report.md`
   - `.qe/ai-team/artifacts/review-report.md`
   - `.qe/ai-team/artifacts/verification-report.md`
   Prefill each with a one-line placeholder such as `> Pending output from {role}` so ownership is obvious.

5. **Communicate next steps**
   - Tell the user that `/Qplan` and `/Qgenerate-spec` must now write the planner artifacts.
   - Remind them that implementer/reviewer/supervisor roles will produce their reports under `.qe/ai-team/artifacts/`.

Existing single-model initialization must not change when the user declines multi-model scaffolding.

#### Agent Teams (Optional)
If the user wants to enable Agent Teams for parallel work:
```json
// .claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```
Note: Agent Teams is experimental. It enables parallel teammate spawning for complex tasks in Eqa-orchestrator, Etask-executor, and Edeep-researcher.

#### .gitignore Entries
If `.gitignore` does not exist, create it; if it does, add only missing entries from below:
```gitignore
# Claude Code
.claude/settings-local.json
.qe/tasks/
.qe/checklists/
.qe/analysis/
TASK_REQUEST_*.md
VERIFY_CHECKLIST_*.md
ANALYSIS_*.md
```

### Step 4: Completion Notice
Show the list of created files and guide the next steps:
- "Initialization complete. Use `/Qgenerate-spec` to create your first task."
- Show a brief summary of analysis results (tech stack, file count, main entry points).

## Creation Rules
- Do not overwrite files that already exist.
- Keep existing `.gitignore` content intact; add only missing entries.
- Do not create files without user confirmation. **MUST use the `AskUserQuestion` tool to confirm — do NOT output confirmation prompts as plain text.**

## Will
- Create CLAUDE.md from template
- Create .qe/ directory structure (including analysis/, TASK_LOG.md)
- Optionally scaffold `.qe/ai-team/config/team-config.json` for multi-model role separation
- Auto-analyze project and save results
- Configure .gitignore
- Create .claude/settings.json

## Will Not
- Create task specs → use `/Qgenerate-spec`
- Write or modify code
- Overwrite existing files
- Modify source code (analysis is read-only)
