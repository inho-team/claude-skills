---
name: Qupdate
description: 'Updates QE Framework for Claude and Codex depending on how it was installed. Use for "update plugin", "upgrade", "update qe".'
allowed-tools: "Bash(claude plugin:*), Bash(npm:*), Bash(node:*)"
invocation_trigger: When framework initialization, maintenance, or audit is required.
recommendedModel: haiku
---

# Qupdate — Framework Self-Update

## Role
Updates QE Framework to the latest version using the correct path for the current installation method.

## Execution Procedure

### Step 1: Detect installation path
Choose exactly one of the following:

1. **Claude plugin install**
   Use when QE was installed via Claude marketplace/plugin flow.

   ```bash
   claude plugin update qe-framework@inho-team-qe-framework
   ```

2. **npm global install**
   Use when QE is being consumed from Codex or terminal via the published npm package.

   ```bash
   npm update -g @inho-team/qe-framework
   ```

3. **Repository-local install**
   Use when the user is working directly from a QE repo checkout and installs via local scripts.

   ```bash
   node install.js
   ```

### Step 2: Preferred selection rule
- If the current environment clearly uses Claude plugin installation, prefer `claude plugin update ...`.
- If the current environment is Codex-first or the package was installed globally, prefer `npm update -g @inho-team/qe-framework`.
- If the current directory is a QE repository checkout with `install.js`, prefer `node install.js` after pulling the latest code.

### Step 3: Report result
Report:
- which update path was used
- whether Claude assets were updated
- whether Codex assets were updated
- that Claude/Codex should be restarted if required

## Will
- Update QE Framework using the correct installer path
- Keep Claude and Codex installation targets in sync when the chosen path supports both
- Report the applied update path and next restart step

## Will Not
- Modify any project files
- Run without user invocation
