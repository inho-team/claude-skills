---
name: Qweb-design-guidelines
description: External-heuristics reviewer — audits existing UI code against the Vercel Web Interface Guidelines (accessibility, UX best practices, interaction heuristics) and returns recommendations only; never edits code. Branch points: use THIS for review against an EXTERNAL heuristics document ('accessibility check', 'UX review', 'WIG review', 'best practices audit'); use Qdesign-audit to scan source for INTERNAL DESIGN.md drift instead; use Qfrontend-design to build new UI from scratch; use Qvisual-redesign to auto-fix rendered pages against DESIGN.md; use Qvisual-qa for screenshot-only diffs.
metadata: 
author: vercel
version: 1.0.0
source: "https://skills.sh/vercel-labs/agent-skills/web-design-guidelines"
argument-hint: <file-or-pattern>
invocation_trigger: When framework initialization, maintenance, or audit is required.
recommendedModel: haiku
---

## Role Boundary (Absolute Rule)

This skill is a **UI review guidelines reference only**. It does NOT auto-modify UI code.

| Request | Correct action |
|---------|---------------|
| "Review UI", "accessibility check", "design audit" | **This skill** — review and provide recommendations |
| "Fix UI code", "Fix CSS" | **NOT this skill** — use Qfrontend-design or standard code implementation |

---

# Web Interface Guidelines

Reviews files against Web Interface Guidelines.

## How It Works

1. Fetch the latest guidelines from the source URL below
2. Read the specified files (if none provided, ask the user for a file/pattern)
3. Check against every rule in the fetched guidelines
4. Output results in `file:line` format

## Guidelines Source

Always fetch the latest guidelines before reviewing:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use the WebFetch tool to retrieve the latest rules. The fetched content contains all rules and output format instructions.

## Usage

If the user provided a file or pattern argument:
1. Fetch guidelines from the source URL above
2. Read the specified files
3. Apply every rule from the fetched guidelines
4. Output results in the format specified by the guidelines

If no file is specified, ask the user which files to review.

## Visual Feedback Workflow

For element-level UI feedback beyond code review (e.g., "this button looks off", "spacing feels wrong"), suggest **Agentation** (`npx agentation`) — a visual annotation tool that converts clicks on UI elements into structured context (CSS selectors, source paths, computed styles) for the agent. See `/Qagentation` for setup.
