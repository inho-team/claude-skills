# PROJECT — qe-framework v6.6

## Vision

Claude-first SIVS (Spec-Implement-Verify-Supervise) 프레임워크.
Claude Code 플러그인으로 동작하며, `codex-plugin-cc`를 통해 선택적으로 Codex에 작업을 위임할 수 있다.

## Core Pillars

1. **Claude-First**: 모든 SVS 단계는 기본적으로 Claude가 수행. Codex는 옵션.
2. **SIVS Loop Integrity**: Spec → Implement → Verify → Supervise 루프는 엔진에 관계없이 항상 보장.
3. **Simple Engine Routing**: 4단계(Spec/Implement/Verify/Supervise) 각각에 `claude` 또는 `codex` 엔진 지정. 복잡한 4역할 매핑 제거.
4. **Zero Codex Dependency**: `codex-plugin-cc` 미설치 시 순수 Claude-only로 동작. 에러 없이 graceful fallback.
5. **Single Install Target**: `~/.claude/`만 관리. `~/.codex/` 설치 로직 완전 제거.

## Milestone History

| Date | Version | Milestone |
|------|---------|-----------|
| 2026-04-24 | v6.6.3 | CHANGELOG + /Mrelease batched release workflow. Universal --help routing. HUD Phase 2. |
| 2026-04-24 | v6.6.0 | Design Skills Upgrade (Canvas, DS Scan, Sliders, Unified Studio). |
| 2026-04-23 | v6.5.0 | Contract Layer v1 (Qcontract, Qverify-contract, Econtract-judge). |
| 2026-04-05 | v5.x | SIVS 4-stage migration + codex-plugin-cc bridge + 71 coding-experts quality enforcement. |
| 2026-04-04 | v4.0 (planned) | Claude-first pivot. Codex bridge via codex-plugin-cc. Remove Gemini/GPT. |
| — | v3.0.27 | Current. Dual-engine (Claude+Codex) with multi-model orchestration. |

## Anti-Goals

- Gemini, GPT 등 다른 프로바이더 직접 지원하지 않음
- Codex CLI를 직접 호출하지 않음 (codex-plugin-cc에 위임)
- `~/.codex/`에 어떤 파일도 설치하지 않음
