---
name: Qhud
description: 'Toggles the QE HUD statusline (context %, session tokens, SIVS engine routing) by writing the statusLine entry into .claude/settings.json. Use for /Qhud, HUD on, HUD off, statusline show, turn HUD on, enable HUD.'
invocation_trigger: When the user wants to turn the QE HUD statusline on or off, or check its current state.
recommendedModel: haiku
---

# Qhud — QE Framework Statusline Toggle

## Role
CLI-style skill that wires the QE HUD statusline into Claude Code by adding/removing a `statusLine` entry in `.claude/settings.json`. The HUD itself lives at `hooks/scripts/statusline.mjs`; this skill only manages activation.

## Scope
- **Default:** project scope → `<PROJECT_ROOT>/.claude/settings.json`
- **`--user` flag:** user scope → `~/.claude/settings.json`
- Never touches `settings.local.json` (that is the user's private override slot).

**Project root detection** (when `--user` is not set):
Walk upward from `$PWD` until one of these markers is found:
`.git/` directory, `package.json`, `pyproject.toml`, `.qe/`, or an existing `.claude/` directory.
The first match becomes `PROJECT_ROOT`. If no marker is found before `$HOME` (or filesystem root), abort with:
```
[!] Could not detect a project root from $PWD. Run from a project directory,
    or use --user to install at ~/.claude/settings.json.
```
This prevents `.claude/settings.json` from being written to a subdirectory where Claude Code will not pick it up.

## CLI Interface

```
/Qhud [subcommand] [flags]
```

| Subcommand | Description |
|------------|-------------|
| (none) / `show` | Print current state (installed? where? preview output) |
| `on`   | Install statusLine entry |
| `off`  | Remove statusLine entry |
| `--help` | Usage guide |

| Flag | Description |
|------|-------------|
| `--user` | Operate on `~/.claude/settings.json` instead of project scope |

## Execution Procedure

### Step 0: Parse
Extract subcommand (`show` | `on` | `off`) and the `--user` flag. On `--help` or invalid input, jump to **Step HELP**.

### Step 1: Resolve paths
1. **Script path** — Resolve the absolute path of `hooks/scripts/statusline.mjs` relative to this plugin (walk up from the skill directory until `hooks/scripts/statusline.mjs` exists). Store as `SCRIPT_ABS`.
2. **Settings path** — `--user` → `$HOME/.claude/settings.json`; otherwise → `$PWD/.claude/settings.json`.

### Step 2: Route by subcommand

#### `show` (default)
1. Read settings JSON if it exists; otherwise treat as `{}`.
2. If `settings.statusLine?.command` contains `statusline.mjs` from this plugin → report **installed**, print the command.
3. If `settings.statusLine` exists but points elsewhere → report **other statusline installed** (don't claim ownership).
4. If absent → report **not installed**.
5. Regardless, run a preview: pipe a synthetic payload through `SCRIPT_ABS` and print the rendered line. Example payload:
   ```json
   { "context_window": { "remaining_percentage": 68, "total_input_tokens": 40000, "total_output_tokens": 2300 } }
   ```
   Command: `echo '<payload>' | NO_COLOR=1 node <SCRIPT_ABS>`

#### `on`
1. Read settings JSON (or start from `{}`).
2. If `statusLine` already points at our script → print "already installed" and exit.
3. If `statusLine` exists and points elsewhere → **ask before overwriting**. Show the existing value and require explicit confirmation in the same turn.
4. Write:
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node \"<SCRIPT_ABS>\""
     }
   }
   ```
   Merge into existing settings (preserve all other keys). Pretty-print with 2-space indent and a trailing newline.
5. Print the resulting `statusLine` block and remind: "Restart the Claude Code session or reload the window for it to appear."

#### `off`
1. Read settings JSON. If missing → print "not installed" and exit.
2. If `statusLine?.command` does NOT contain our plugin's `statusline.mjs` → print "statusLine belongs to another source; not removing" and exit.
3. Delete the `statusLine` key and write back.
4. Print confirmation.

### Step HELP
Print:
```
Qhud — QE HUD statusline toggle

Usage:
  /Qhud            Show current state and preview
  /Qhud on         Install into .claude/settings.json (project scope)
  /Qhud off        Remove from .claude/settings.json
  /Qhud on --user  Install into ~/.claude/settings.json (user scope)
  /Qhud --help     Show this help

HUD shows:  ctx N%  │  <tokens> tok  │  SIVS <routing>
Script:     hooks/scripts/statusline.mjs
Phase 2 (not yet in MVP): 5h / 7d rate limit %, model name, session cost.
```

## Safety Rules
- Never write to `settings.local.json`.
- Never overwrite a foreign `statusLine` entry without explicit confirmation.
- Preserve all unrelated keys in settings.json.
- On JSON parse failure, stop and report the exact path; do not auto-rewrite.
- Always write a pretty-printed JSON with 2-space indent and a trailing newline.

## Will
- Add or remove a single `statusLine` entry in a single settings.json file.
- Preview the rendered HUD string via a synthetic stdin payload.
- Detect and refuse to clobber a non-QE statusline without confirmation.

## Will Not
- Modify any file other than the chosen settings.json.
- Touch plugin.json, hooks.json, or the script itself.
- Install globally without the `--user` flag.
