---
name: Qgenerate-spec
description: Generates 3 project spec documents (CLAUDE.md, TASK_REQUEST, VERIFY_CHECKLIST) from a project description. Use when the user wants to start a new project, define task specifications, or create a task.
invocation_trigger: When a new project, task, or bug fix spec needs to be defined.
user_invocable: true
recommendedModel: haiku
---

# Project Spec Document Generation (Qplan Component)

## Role
You are a specialist document writer acting as a **sub-component of the `/Qplan` ecosystem**. Your primary goal is to transform a high-level roadmap Phase into **Haiku-Ready Atomic Tasks**.

## Role Constraints (Absolute Rules)
- When this skill is invoked, focus exclusively on writing the 3 spec documents.
- Do not perform any actions outside of document writing, such as writing code, fixing bugs, or answering general questions.
- **User confirmation MUST use `AskUserQuestion` tool — NEVER print options as plain text.** This applies to Step 3 and any other point requiring user input. Printing "Generate & Execute / Generate Only / Needs Revision" as text is strictly prohibited.

## Documents to Generate

| # | Filename | Path | Description |
|---|----------|------|-------------|
| 1 | `CLAUDE.md` | Project root | Project context — goals, constraints, decisions. Must reference `QE_CONVENTIONS.md` for QE rules. Task history is in `.qe/TASK_LOG.md`. |
| 2 | `TASK_REQUEST_{UUID}.md` | `.qe/tasks/pending/` | Task request — what, how, checklist, notes |
| 3 | `VERIFY_CHECKLIST_{UUID}.md` | `.qe/checklists/pending/` | Verification checklist — validation criteria, additional notes |

- A single task shares the same UUID across both documents.
- Multiple tasks get separate TASK_REQUEST / VERIFY_CHECKLIST pairs.
- Newly generated documents always go in `pending/`.

## Workflow

### Step 1: Context Acquisition (Mandatory)
Before collecting user info, identify the strategic context:
1. **Check Roadmap**: Read `.qe/planning/ROADMAP.md` and `STATE.md`.
2. **Identify Phase**: If an active Phase exists, use its **Success Criteria** and **Requirement IDs** as the primary source of truth for the spec.
3. **Missing Roadmap**: If no roadmap exists, **STOP** and suggest running `/Qplan` first to maintain the PSE Loop integrity.

### Step 2: Information Gathering
... (omitted) ...

Required information:
- **Project name**, **description** (one-paragraph summary)
- **Goals** (1-5 items), **Constraints** (tech stack, performance, security, etc.), **Decisions** (finalized)
- **Task list** — for each task: what, how, steps (checklist), expected output files (optional), notes, type (`code`|`analysis`|`docs`|`other`), validation criteria (checks), verification notes, and optional decision rationale (chosen approach, alternatives, consequences)

### Step 2: Draft Documents
Write drafts using templates from `templates/` directory (`TASK_REQUEST_TEMPLATE.md`, `VERIFY_CHECKLIST_TEMPLATE.md`). For CLAUDE.md, reference `QE_CONVENTIONS.md` (project root) for QE rules (file naming, task status, completion criteria) and include a reference line pointing to it. Replace `{{placeholder}}` with actual content.
- **Model Preference**: Use **Haiku** for drafting standardized templates to reduce latency.

### Step 2.5: Spec Verification (Automatic)
After drafting, verify spec quality. **Skip conditions (fast path):** checklist ≤ 3 items OR `type: docs`/`analysis` → skip entirely, proceed to Step 3.

When verification runs, perform **both structural and executability checks in a single pass**:

**Structural criteria (S1-S5) — Use Haiku**:
1. Single responsibility per item
2. Specific and verifiable (yes/no)
3. TASK_REQUEST/VERIFY_CHECKLIST consistency
4. No constraint conflicts
5. No missing dependencies

**Executability criteria (E1-E4) — Use Sonnet**:

| # | Criterion | Fail Example |
|---|-----------|--------------|
| E1 | Single-action executability | `"API 설계 및 라우트 구현"` — two distinct edits |
| E2 | Output path validity | `→ output: src/utils/helper` — missing extension |
| E3 | Logical ordering | Item 3 references file from Item 5 |
| E4 | Verifiable completion | `"코드를 적절히 리팩토링"` — subjective |

**For complex tasks (8+ items):** Spawn Plan agent (`subagent_type: "Plan"`, model: **Haiku**) for S1-S5 review while self-checking E1-E4 in parallel using **Sonnet**. Max 2 iterations.

**For simple tasks (4-7 items):** Self-check all 9 criteria without agent spawn. Use **Sonnet** for full-pass or **Haiku** for S1-S5 if splitting. Max 1 iteration.

Any fail → fix automatically. After max iterations, proceed with best version.

### Step 3: Review, Create, and Execute (Single Confirmation)
> **MANDATORY:** Use `AskUserQuestion` tool to collect user choice. Do NOT output options as plain text.

Show drafts to user and collect feedback with a **single `AskUserQuestion`** offering these options:
- **"Generate & Execute"** — Standard execution via `/Qrun-task {UUID}`
- **"Generate & Atomic-Run"** — High-speed parallel execution via `/Qatomic-run {UUID}`. **Suggest this if the checklist contains 5+ independent, simple items.**
- **"Generate Only"** — Create files only
- **"Needs Revision"** — Revise after feedback

On "Generate & Atomic-Run":
- Auto-create directories and files
- Invoke `/Qatomic-run {UUID}` immediately. (Sets `<!-- chained-from: Qgenerate-spec -->` flag so Qatomic-run skips approval)


On "Generate & Execute" or "Generate Only":
- Auto-create directories (`mkdir -p`)
- Create all spec files
- If existing `TASK_REQUEST_*.md` / `VERIFY_CHECKLIST_*.md` found in project root, suggest migrating to `.qe/tasks/pending/` and `.qe/checklists/pending/`
- **On initial setup**, if `.claude/settings.json` and `.mcp.json` don't exist, suggest creating with defaults
- **Automatic `.gitignore` management:** Add missing entries under `# Claude Code` section:
  ```gitignore
  # Claude Code
  .claude/settings-local.json
  .qe/tasks/
  .qe/checklists/
  TASK_REQUEST_*.md
  VERIFY_CHECKLIST_*.md
  ANALYSIS_*.md
  ```

Output status summary after file creation:
```
✅ 생성 완료 (spec documents only):
- CLAUDE.md
- .qe/tasks/pending/TASK_REQUEST_{UUID}.md
- .qe/checklists/pending/VERIFY_CHECKLIST_{UUID}.md

❌ 아직 없는 것 (실제 작업 결과물):
- {expected output files from TASK_REQUEST checklist}
```

On "Generate & Execute":
- **Single task** → invoke `/Qrun-task {UUID}` immediately.
- **Multiple tasks** → invoke `/Qrun-task {UUID1} {UUID2} ... {UUIDn}` with all generated UUIDs space-separated in a single call. Qrun-task handles parallel execution.

## Autonomous Mode Support

When called from Qutopia (autonomous mode), Qgenerate-spec:
- Skips all `AskUserQuestion` calls — auto-selects first option
- Auto-proceeds through Steps 1-3 without user confirmation
- Sets `<!-- chained-from: Qgenerate-spec -->` on generated TASK_REQUEST files

See `Qutopia` for autonomous execution modes (`--work`, `--qa`).

## Document Writing Rules

### Language Matching (Required)
TASK_REQUEST and VERIFY_CHECKLIST must match the user's language.
- Korean user → Korean documents; English user → English documents; mixed/unclear → English
- **Scope:** TASK_REQUEST and VERIFY_CHECKLIST only. Internal framework files stay English. CLAUDE.md follows user language but not strictly enforced.

### CLAUDE.md
- Single Source of Truth; read by AI every session
- **Do NOT write task lists in CLAUDE.md.** Task history lives in `.qe/TASK_LOG.md`. CLAUDE.md only contains a reference pointer: `## Task Log` → `.qe/TASK_LOG.md` 참조
## Document Writing Rules

### TASK_REQUEST
- **What vs How**: Clearly separate the business goal from the technical implementation logic (from GSD Plan patterns).
- **Atomic Items**: Every checklist item must be **independent** and **verifiable**.
- **Dependency Mapping**: If an item depends on another, mark it: `- [ ] {desc} <!-- depends_on: [UUID/Item#] -->`.
- **Haiku-Ready**: Ensure items are small enough to be implemented without Sonnet-level reasoning.
- **Output files**: Always append `→ output: {file-path}` for direct accountability.

### VERIFY_CHECKLIST
- Each criterion answerable as yes/no
- Task complete when all items checked
- Include note to update `.qe/TASK_LOG.md` task list to ✅
- **Auto-include by type:**
  - `type: code` → add: "변경된 코드에 보안 취약점(OWASP Top 10)이 없는가", "기존 테스트가 통과하는가"
  - `type: code` + auth/crypto/payment → add: "인증/암호화 구현이 안전한가 (Esecurity-officer 또는 수동 확인)"
  - `type: docs` → add: "문서 내 링크가 유효한가", "용어/포맷이 일관적인가"

## UUID Generation Rules
- 8-character hex (e.g., `a1b2c3d4`)
- Same UUID shared between TASK_REQUEST and VERIFY_CHECKLIST for same task

## Self-Evolving
- After completing tasks, if recurring patterns found, suggest template improvements
- On user approval, reflect patterns in future generation

## Output Format
- Wrap document content in markdown code blocks when displaying
- Pure markdown only, no JSON
