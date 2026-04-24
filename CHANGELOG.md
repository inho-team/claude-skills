# Changelog

All notable user-visible changes to the QE Framework are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/). Versioning: [SemVer](https://semver.org/).

**Release policy**: see `QE_CONVENTIONS.md` → Release Process.

- **PATCH** — bundled bug fixes, tweaks. Batched release (weekly or every ~5 fixes).
- **MINOR** — new skills, agents, or feature additions. Monthly cadence.
- **MAJOR** — breaking changes. Rare.
- **Hotfix patch release** (between batches) — only for security / data loss / framework-unusable regressions.

All entries should land in `[Unreleased]` until `/Mrelease` cuts a version.

## [Unreleased]

### Added
- Qcritical-review: integrate OMC 9-step protocol (Pre-commitment / Multi-perspective / Pre-Mortem / Ambiguity Scan / Devil's Advocate / Self-audit / Realist / Adversarial / Gap Analysis) — adapted from oh-my-claudecode (MIT)
- **HUD element architecture** — `hud-renderer.mjs` split into `hud/elements/*.mjs` (context, rate-limits, model, tokens, sivs, phase, task, model-ratio) + a preset-driven composer. Adding a new HUD element is now a single file + one preset edit.
- **Qhud `--preset <name>` flag** — pick element ordering at install time. Presets: `session` (default, v6.6.3 shape), `focused` (ctx/phase/task/sivs), `qe` (planning-layer only), `mix` (includes model-ratio), `full` (everything).
- **New HUD element: `phase`** — reads `.qe/planning/STATE.md` and surfaces the current Active Phase (e.g., `P: Phase 1`). Renders nothing when idle.
- **New HUD element: `task`** — reads the most-recent pending `TASK_REQUEST_*.md` and surfaces its UUID + title (e.g., `T: abc12345 Build landing page`). Renders nothing when no pending tasks.
- **New HUD element: `model-ratio`** — session-wide token distribution across Opus / Sonnet / Haiku / Codex that sums to exactly 100 (e.g., `O:42·S:31·H:12·X:15`). Reads the JSONL transcript at `data.transcript_path`, buckets by `message.model`; Claude turns invoking codex tool_use (`mcp__codex*` / `codex:rescue`) go into the `X` bucket as a delegation-cost proxy.

### Changed
- `hooks/scripts/lib/hud-renderer.mjs` is now a compatibility shim that re-exports the old public surface (`safe`, `formatTokens`, `pickContextUsed`, `pickRateLimits`, `pickModelName`, `pickSessionTokens`, `renderSivsLetters`, `renderHud`). New code should import from `hud/renderer.mjs` + individual elements.
- `formatTokens` now uses capital `M` for millions (`1.5M`) and promotes `999_500+` to `M` to avoid rendering `1000k`.

### Fixed

### Removed

### Security

## [6.6.3] - 2026-04-24

### Added
- `CHANGELOG.md` + `/Mrelease` skill establishing batched release workflow. Commits now accumulate entries under `[Unreleased]`; release is a deliberate action, not a per-commit side effect.
- **Qhelp Mode B** — `/Qhelp {skillName}` reads the target skill's SKILL.md and generates a 4-section summary (Summary / When to use / What it does / Usage) in the user's language. Uses `.qe/profile/language.md` for locale detection.
- **Universal `--help` flag** — typing `/Qxxx --help` or `/Qxxx -h` for any Q- or M-prefix skill is detected in the prompt-check hook and routed to `/Qhelp {skillName}`. Backed by `hooks/scripts/lib/help-flag-parser.mjs`.
- **Qhud Phase 2** — HUD now displays Anthropic rate-limit usage (`5h` / `7d`) and model label (`Opus`/`Sonnet`/`Haiku`), plus an ANSI-sanitizing `safe()` helper that strips escape sequences from untrusted payload fields before emission.

### Changed
- Mbump is now a sub-step of `/Mrelease`; direct `/Mbump` invocation still works for explicit overrides but is no longer the recommended release path.
- **Qhud** — context percentage now displays *used* (e.g. `ctx 16%`) instead of *remaining*. Color thresholds: green `<50`, yellow `50–80`, red `≥80`. Inverse of prior behavior; matches common "capacity used" UX.
- **Qhud** — SIVS routing always renders as 4-letter `C/C/C/C` (spec/implement/verify/supervise, `C=claude X=codex`). The previous "claude" compact label for all-Claude configs is removed in favor of stable positional display.
- **Internal API rename** in `hooks/scripts/lib/hud-renderer.mjs`: `pickContextRemaining()` → `pickContextUsed()` (return semantics inverted). Hook-internal lib; no external callers known.

## [6.6.2] - 2026-04-24

### Added
- QE HUD statusline primitive (`Qhud`, `hud-renderer.mjs`, `statusline.mjs`).

### Fixed
- `comment-checker` JSDoc walk — dynamic lookback replaces fixed 5-line window so long JSDoc blocks (8+ lines) no longer trigger false "undocumented" warnings.

## [6.6.1] - 2026-04-24

### Fixed
- `slider-parser.applyValues` — digit-boundary lookaround replaces `\b` word boundary so `padding: 32px` → `padding: 48px` now rewrites correctly inside unit suffixes.
- `design-scanner` — tailwind `fontFamily: ['Inter', 'sans-serif']` arrays no longer truncate at the first comma.
- `artifact-dispatcher` — added implicit UI keywords (`landing page`, `page`, `component`, `dashboard`, `페이지`, etc.) so multi-artifact briefs like "pitch deck and the landing page" return `['code', 'deck']`. Leading word-boundary match prevents substring false positives (`ui` no longer matches inside `build`).

## [6.6.0] - 2026-04-24

### Added — Design Skills Upgrade (Claude Design parity+)
- **Phase 1 — Foundation**: `design-scanner.mjs` (`/Qdesign --scan` auto-bootstraps DESIGN.md from tailwind config + component className scan), `canvas-preview.mjs` (`/Qfrontend-design --canvas` live browser render via playwright MCP, claude-in-chrome fallback).
- **Phase 2 — Iteration Primitives**: `slider-parser.mjs` (markdown slider syntax for tunable tokens), `inline-comment-parser.mjs` (`<!-- claude: ... -->` directive pickup on skill re-invocation), `/Qvisual-redesign --tune` mode for interactive UI token editing.
- **Phase 3 — Unified Studio**: `/Qdesign-studio` orchestrator (one brief → code + deck + doc + mockup + prototype), `artifact-dispatcher.mjs` keyword-based artifact routing, `/Qfrontend-design --prototype` 1-file HTML sketch mode.
- 77 new unit tests, 249/249 total green.

## [6.5.0] - 2026-04-23

### Added — Contract Layer v1
- `/Qcontract`, `/Qverify-contract`, `Econtract-judge` agent, `.qe/contracts/` structure.
- 14 initial contracts approved and locked.

### Changed
- Naming 7-principle framework expanded in `core/rules/naming.md`.

## [5.x] - 2026-04-05

### Added — SIVS 4-stage migration
- Split SVS (3-stage) into SIVS (Spec-Implement-Verify-Supervise 4-stage).
- codex-plugin-cc bridge for optional Codex engine routing per stage.
- Decision log entries D001–D005 documenting the rationale.

### Removed
- Direct Gemini / GPT provider integrations (D001).
- All `~/.codex/` installation logic (D004).

## [4.0] - 2026-04-04

### Added — Claude-first baseline
- Strip/Bridge/Polish initiative establishing Claude-only core with optional plugin bridge.

---

**Older history** prior to v4.0 lived in previous planning artifacts and is not reconstructed here; see `.qe/planning/DECISION_LOG.md` and git history for context.
