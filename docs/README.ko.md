# QE Framework 문서 안내

QE Framework는 Claude Code용 스펙 기반 작업 프레임워크입니다.

기본 흐름:

```text
/Qplan -> /Qgs -> /Qatomic-run -> /Qcode-run-task
```

이 문서는 한국어 진입 문서입니다. 전체 설명을 한 파일에 몰아넣기보다, 주제별 문서로 나눠 안내합니다.

## 먼저 볼 문서

- 프로젝트 개요: [../README.md](../README.md)
- 철학과 설계 의도: [PHILOSOPHY.md](PHILOSOPHY.md)
- 상세 사용법: [USAGE_GUIDE.md](USAGE_GUIDE.md)
- 문서 전체 지도: [DOCUMENTATION_MAP.md](DOCUMENTATION_MAP.md)
- 멀티모델 설정: [MULTI_MODEL_SETUP.md](MULTI_MODEL_SETUP.md)
- 시스템 개요: [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)

## 핵심 개념

- `single-model`
  - Claude만 사용하는 기본 경로
  - `/Qatomic-run`은 Haiku swarm 기반 atomic execution
- `hybrid`
  - 일부 역할만 외부 runner 사용
- `multi-model`
  - planner / implementer / reviewer / supervisor를 역할별로 명시적으로 분리

## 구독 조합별 권장 방향

| 사용 가능 도구 | 권장 모드 | 권장 기본 매핑 |
|----------------|-----------|----------------|
| Claude만 | `single-model` | Claude가 전 역할 담당 |
| Claude + Codex | `hybrid` | implementer = Codex, 나머지 = Claude |
| Claude + Gemini | `hybrid` | reviewer = Gemini, 나머지 = Claude |
| Claude + Codex + Gemini | `multi-model` | planner/supervisor = Claude, implementer = Codex, reviewer = Gemini |

## 빠른 시작

1. 플러그인 설치

```bash
claude plugin marketplace add inho-team/qe-framework
claude plugin install qe-framework@inho-team-qe-framework
```

2. 프로젝트 초기화

```text
/Qinit
```

3. 작업 흐름 시작

```text
/Qplan
/Qgs
/Qatomic-run
/Qcode-run-task
```

## 참고

- quota 차단 시 임시 대체 runner는 `--role-override`로 재실행합니다.
- 이 override는 현재 실행에만 적용되고 `team-config.json`은 바꾸지 않습니다.
