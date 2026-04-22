---
name: Qcontract
description: Manage business-logic contracts — create, edit, list, and approve structured contract files in .qe/contracts/. Contracts are machine-verifiable specifications that LLM judges later compare against implementation and tests. Use when the user says 'create a contract', 'approve contract', 'list contracts', or '/Qcontract'.
invocation_trigger: When the user wants to create, edit, list, or approve a business-logic contract.
user_invocable: true
recommendedModel: haiku
---

# Business-Logic Contract Management (Qcontract)

## Role

You are a specialist in managing the lifecycle of business-logic contracts stored under `.qe/contracts/`. Contracts are 6-section markdown documents (Signature/Purpose/Constraints/Flow/Invariants/Error Modes) that define machine-verifiable specifications. These contracts are later used by LLM judges to verify that implementations match their specifications and that test coverage aligns with contract requirements. Every change to a contract requires explicit user approval through an interactive gate. Approvals are recorded in `.qe/contracts/.lock` as a hash + timestamp + approval reason.

## Subcommands

### `/Qcontract create <name>`

Create a new draft contract file.

**Steps:**
1. Validate `<name>`: alphanumeric, hyphen, underscore only. Reject `../`, `/`, and other special characters.
2. Read `.qe/contracts/TEMPLATE.md` as the base.
3. Use `AskUserQuestion` to prompt for:
   - **Target file** (e.g. `hooks/scripts/lib/foo.mjs`, or a function path)
   - **Short purpose line** (1-2 sentences describing what this contract validates)
4. Fill the template with the target file and purpose information.
5. Write draft to `.qe/contracts/pending/{name}.md`.
6. Report: "Draft contract created at `.qe/contracts/pending/{name}.md`. Move to `active/` when ready, then run `/Qcontract approve {name}`."

### `/Qcontract edit <name>`

Edit an existing contract (in `active/` or `pending/`).

**Steps:**
1. Locate contract via `contract-manifest.mjs` → `resolveContractPath(name)` (searches `active/` first, then `pending/`).
2. Read current content and present to user via `AskUserQuestion`: "What would you like to change?" (allow free-form editing directions or show diff).
3. Apply edits to the contract file.
4. Compute a short diff summary: "Sections changed: {list}".
5. **Approval Gate (CRITICAL)**: Use `AskUserQuestion` with options: `[Save changes / Revert / Amend]`
   - **Save changes**: Write file + **INVALIDATE lock** (remove or mark stale) — user must re-run `/Qcontract approve` to re-lock.
   - **Revert**: Discard all edits, no file write.
   - **Amend**: Return to editing prompt (Step 2).
6. **Note**: Lock invalidation is the machine-enforced safety half. The AI AskUserQuestion gate is the first line; if skipped, the lock will still detect hash drift on next verify.

### `/Qcontract list`

List all contracts with approval status.

**Steps:**
1. Call `contract-manifest.mjs` → `listActive()` and `listPending()`.
2. Call `contract-lock.mjs` → `readLock()` to fetch approval status.
3. Print a table with columns:
   - `Name` — contract identifier
   - `State` — `active` or `pending`
   - `Lock Status` — `match` (content matches approved hash), `mismatch` (drifted, needs re-approval), or `unapproved` (no lock entry)
   - `Approved At` — timestamp, or `—` if unapproved
   - `Reason` — approval reason, or `—` if unapproved

### `/Qcontract approve <name> [--reason <text>]`

Approve a contract (lock it at its current hash).

**Steps:**
1. Validate `<name>`.
2. Locate contract via `contract-manifest.mjs` → `resolveContractPath(name)`.
3. **Enforce**: Contract must be in `active/` — refuse to approve `pending/` files. Guide user: "Move {name} to `active/` first."
4. Read contract content.
5. Compute hash via `contract-hash.mjs` → `computeContractHash(text)`.
6. If `--reason` not provided: use `AskUserQuestion` to prompt: "Approval reason? (1 sentence)"
7. Call `contract-lock.mjs` → `updateLockEntry(name, hash, reason, timestamp)`.
8. Report: "✅ Approved {name} with hash {prefix}... at {timestamp}. Reason: {reason}"

## Dependencies

This skill depends on the following library modules:

- `hooks/scripts/lib/contract-manifest.mjs` — contract listing, path resolution, name validation
- `hooks/scripts/lib/contract-hash.mjs` — SHA256-based content hashing
- `hooks/scripts/lib/contract-lock.mjs` — approval record read/write to `.qe/contracts/.lock`
- `hooks/scripts/lib/contract-parser.mjs` — (existing Phase 1) validation and section parsing
- `hooks/scripts/lib/contract-validator.mjs` — (existing Phase 1) semantic validation

## Examples

```
/Qcontract create user-service
→ Prompts for target file and purpose.
→ Creates .qe/contracts/pending/user-service.md

/Qcontract list
→ Table showing all contracts, lock status, and approval info.

/Qcontract edit sivs-enforcer
→ Prompts for changes.
→ Shows diff, asks to save/revert/amend.
→ If saved, invalidates lock.

/Qcontract approve sivs-enforcer --reason "Reviewed and aligned with Phase 1"
→ Confirms content hash, records approval.
→ Prints: ✅ Approved sivs-enforcer with hash a1b2c3d4... at 2026-04-22T14:35:00Z
```

## Will

- **Enforce approval gates**: Every contract edit triggers `AskUserQuestion` before save.
- **Record all approvals**: Lock file tracks hash, timestamp, and user reason.
- **Validate names**: Reject invalid identifiers.
- **Machine-verifiable**: Lock drift detection ensures edits don't bypass approval.

## Will Not

- **Bypass `AskUserQuestion`**: All edits require user confirmation.
- **Modify contracts in `active/` without `edit`**: Use `/Qcontract edit`, not direct file writes.
- **Delete contracts**: Out of scope. Use file system commands if needed.
- **Approve `pending/` files**: Only `active/` contracts can be approved.
- **Forgive lock drift**: If hash changes, re-approval is mandatory.

## Notes on Lock Invalidation

When a user saves edits via `/Qcontract edit`, the skill removes or marks the lock entry as stale. This forces the next `/Qcontract verify` (future Phase) or `/Qcontract approve` to recompute and re-lock at the new hash. This two-layer safety (AI prompt + machine hash check) ensures contracts remain trustworthy.

## Handoff

After contract operations (create/edit/approve/list), use standard handoff format:

```
Phase 2: Contract Layer — {operation} complete

PSE: [x] Plan [x] Spec [>] Execute [ ] Verify

Contract: {name} — {status}
Next: /Qcontract list
```
