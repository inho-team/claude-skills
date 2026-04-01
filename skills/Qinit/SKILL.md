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

#### Tiered Orchestration Scaffolding (Opt-in)
Only run this block when the user explicitly wants **tiered model orchestration** (`tiered-model`), **multiple AIs assigned by role** (`multi-model`), or a **mixed setup where only some roles use another AI** (`hybrid`). Confirm via `AskUserQuestion` (yes/no) before touching `.qe/ai-team/`.

This block is mandatory once the user opts in.
- Do not silently copy the default template and continue.
- Do not assume `Claude + Codex + Gemini` unless the user explicitly picks it.
- Do not skip role assignment questions when `.qe/ai-team/` is being created for the first time.
- Before writing `.qe/ai-team/config/team-config.json`, you **must** collect or confirm the role mapping for `planner`, `implementer`, `reviewer`, and `supervisor`.
- If the user chooses a preset, you **must** still show the resulting role-to-runner mapping and get confirmation before writing the config.

Before seeding the config, explain the setup in user-facing language and then ask how the user wants to assign AIs to roles.
- First use plain language such as: "Do you want to use one AI for everything, use Claude tiering by difficulty (Opus/Sonnet/Haiku), or split work by role across multiple AIs?"
- Do not ask only for provider names with no explanation.
- When the word `runner` appears, explain it immediately: `runner (the saved AI execution setup used for a role)`.
- Multiple roles may reuse the same runner.
- The same provider may appear in multiple runners, such as `claude_planner`, `claude_reviewer`, and `claude_supervisor`.
- Provider choice alone is not enough. You must also collect or confirm the concrete model for each runner.
- Explain `model` in plain language the first time it appears: `model (the specific engine used by that AI runner, such as Claude Sonnet, Claude Opus, gpt-5-codex, or gemini-2.5-pro)`.
- Do not silently keep template defaults if the user wants a different model.

Recommended starting choices to offer:
- `Tiered Claude (Opus + Sonnet + Haiku)`
- `Tiered Codex (GPT-5.4 + GPT-5-Codex + GPT-5-Codex-Mini)`
- `Claude + Codex + Gemini`
- `All Claude`
- `Custom`

Even when the user chooses a quick preset, ask one confirmation question in plain language:
- `I will assign planning, implementation, review, and final verification using this setup. Do you want to keep this mapping or change any role?`
- Then ask whether they want to keep the recommended models or change any model before writing the config.

If the user wants to change any role, switch immediately to role-by-role questions.

If the user picks `All Claude`, still create distinct runners by default:
- `claude_planner`
- `claude_implementer`
- `claude_reviewer`
- `claude_supervisor`

If the user picks `Custom`, ask role by role instead of asking for one vague "multi-model" setup.
- `planner (the role that makes the plan)`:
  ask which AI should handle planning
- `implementer (the role that writes the implementation)`:
  ask which AI should handle implementation
- `reviewer (the role that checks the work)`:
  ask which AI should handle review
- `supervisor (the role that makes the final pass/fail decision)`:
  ask which AI should handle the final gate

For each role, collect:
- runner name (`runner`, the saved AI setup used for that role)
- provider
- model
- executable path
- argument template
- timeout

Recommended model prompts by provider:
- Claude:
  - offer `haiku`, `sonnet`, `opus`, then `custom`
  - explain briefly: `haiku = fastest/cheapest`, `sonnet = balanced default`, `opus = strongest reasoning`
- Codex:
  - offer `gpt-5-codex-mini`, `gpt-5-codex`, `gpt-5.4`, then `custom`
  - explain briefly: `gpt-5-codex-mini = cheapest/fastest`, `gpt-5-codex = balanced coding default`, `gpt-5.4 = strongest reasoning`
- Gemini:
  - offer `gemini-2.5-pro`, then `custom`

If a preset is chosen, propose recommended provider+model pairs together, not provider only.

Preset defaults:
- `Tiered Claude`
  - planner = Claude `opus`
  - implementer = Claude `sonnet`
  - reviewer = Claude `sonnet`
  - supervisor = Claude `opus`
  - low-complexity helper runner = Claude `haiku`
- `Tiered Codex`
  - planner = Codex `gpt-5.4`
  - implementer = Codex `gpt-5-codex`
  - reviewer = Codex `gpt-5-codex`
  - supervisor = Codex `gpt-5.4`
  - low-complexity helper runner = Codex `gpt-5-codex-mini`
- `Claude only`
  - planner = Claude `sonnet`
  - implementer = Claude `sonnet`
  - reviewer = Claude `sonnet`
  - supervisor = Claude `opus`
- `Claude + Codex`
  - planner = Claude `sonnet`
  - implementer = Codex `gpt-5-codex`
  - reviewer = Claude `sonnet`
  - supervisor = Claude `opus`
- `Claude + Gemini`
  - planner = Claude `sonnet`
  - implementer = Claude `sonnet`
  - reviewer = Gemini `gemini-2.5-pro`
  - supervisor = Claude `opus`
- `Claude + Codex + Gemini`
  - planner = Claude `sonnet`
  - implementer = Codex `gpt-5-codex`
  - reviewer = Gemini `gemini-2.5-pro`
  - supervisor = Claude `opus`

Then build `roles.{role}.runner` plus the matching `runners.{runnerName}` entries.

Recommended question flow:
1. `Do you want to use one AI for the whole project, use Claude tiering by difficulty, or split roles across multiple AIs?`
2. If split roles is selected: `Do you want a quick preset, or do you want to choose the AI for each role one by one?`
3. If a quick preset is selected:
   - show the full role -> runner -> provider -> model summary
   - ask `Do you want to keep these models, or change any role/model before saving?`
4. If choosing one by one, ask in this order:
   - `Which AI should handle planning (planner)?`
   - `Which AI should handle implementation (implementer)?`
   - `Which AI should handle review (reviewer)?`
   - `Which AI should handle the final decision (supervisor)?`
   - After each provider answer, ask `Which model should this role use?`
   - After each model answer, ask the runner details needed to build a valid config if they are not already implied by an existing runner.
5. After collecting answers, show a short summary such as:
   - `planner -> claude_planner`
   - `implementer -> codex_implementer`
   - `reviewer -> gemini_reviewer`
   - `supervisor -> claude_supervisor`
   and also show:
   - `claude_planner -> provider claude / model sonnet`
   - `codex_implementer -> provider codex / model gpt-5-codex`
   - `gemini_reviewer -> provider gemini / model gemini-2.5-pro`
   - `claude_supervisor -> provider claude / model opus`
6. Ask for explicit confirmation before writing `.qe/ai-team/config/team-config.json`.

Do not write the config if any selected runner is missing a `model`.

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
   - If any role mapping was not explicitly chosen or confirmed, stop and ask the missing question before writing the file.
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
   - Tell the user in plain language: `Setup is complete. The usual workflow is /Qplan -> /Qatomic-run -> /Qcode-run-task.`
   - Then explain that `/Qplan` and `/Qgenerate-spec` will now write the planner artifacts.
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
