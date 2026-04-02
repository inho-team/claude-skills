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

1. **Checked-out release tarball install**
   This is the preferred path for both Claude and Codex.

   ```bash
   git pull
   npm pack --cache /tmp/qe-npm-cache
   npm install -g ./inho-team-qe-framework-3.0.26.tgz
   qe-framework-install
   ```

2. **Repository-local direct install**
   Use when the user is already in a QE checkout and wants to sync assets without rebuilding the global tarball.

   ```bash
   node install.js
   ```

### Step 2: Preferred selection rule
- Prefer the checked-out release tarball flow whenever possible.
- If the user is already inside a QE repository checkout and only needs asset sync, prefer `node install.js`.
- Do not recommend `npm update -g @inho-team/qe-framework` unless the package is actually published to npm.

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
