---
name: Qrt
description: Pure pass-through alias for /Qrun-task — forwards every argument unchanged. Branch points: this file exists ONLY to preserve the /Qrt typed shortcut; all routing, execution, and semantics come from Qrun-task. Candidate for deprecation in favor of an intent-routes.json hook (see Phase 3 audit recommendation). Do not add behavior here.
user_invocable: true
invocation_trigger: When framework initialization, maintenance, or audit is required.
recommendedModel: haiku
---

# Qrt — Shortcut for Qrun-task

Invoke `/Qrun-task` with all provided arguments.
