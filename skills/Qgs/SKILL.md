---
name: Qgs
description: "Generate spec documents (TASK_REQUEST + VERIFY_CHECKLIST). Shortcut for /Qgenerate-spec. PSE Chain Step 2: Spec."
user_invocable: true
invocation_trigger: "When the user wants to generate a spec, create a task, or types /Qgs. Also triggered from PSE Chain handoffs after /Qplan."
recommendedModel: haiku
---

# Qgs — Spec Generation (PSE Chain Step 2)

This is the canonical shortcut for `/Qgenerate-spec`.

## Behavior
1. Pass all arguments directly to `/Qgenerate-spec`.
2. If arguments include a Phase reference (e.g., `Phase 2: Codex Bridge`), Qgenerate-spec will read `.qe/planning/ROADMAP.md` to extract that Phase's tasks.

## Usage Examples
```
/Qgs                          # Interactive — asks for project info
/Qgs Phase 2: Codex Bridge    # Phase-based — reads roadmap for Phase 2
/Qgs fix login bug            # Freeform — generates spec from description
```

## Implementation
Invoke the `Qgenerate-spec` skill with the user's full argument string. Do not modify or interpret the arguments — pass them through as-is.
