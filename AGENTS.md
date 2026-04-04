# AGENTS.md

## Project / 프로젝트

- Name / 이름: `@inho-team/qe-framework`
- Purpose / 목적: spec-driven task execution framework for Claude Code and Codex / Claude Code와 Codex를 위한 스펙 기반 작업 실행 프레임워크
- Version sync / 버전 동기화: `package.json` and `.claude-plugin/plugin.json` must stay aligned / `package.json`과 `.claude-plugin/plugin.json`의 버전은 항상 같이 맞춘다

## Structure / 구조

- `skills/`: user-facing QE skills; each skill lives in its own folder with `SKILL.md` / 사용자용 QE 스킬 디렉터리이며 각 스킬은 자체 폴더와 `SKILL.md`를 가진다
- `agents/`: background agents, usually `E*.md` / 백그라운드 에이전트 정의, 보통 `E*.md` 패턴을 사용한다
- `.claude-plugin/`: Claude plugin manifest and shipped assets / Claude 플러그인 매니페스트와 배포 자산
- `hooks/scripts/`: lifecycle hook implementations / 라이프사이클 훅 구현
- `scripts/`: operational CLIs and validators / 운영용 CLI와 검증 스크립트
- `core/`: shared schemas, rules, and runtime context definitions / 공통 스키마, 규칙, 런타임 컨텍스트 정의
- `docs/`: user-facing documentation and setup guides / 사용자 문서와 설정 가이드

## Working Rules / 작업 규칙

- Prefer minimal, surgical changes that preserve existing skill and agent naming patterns / 기존 스킬·에이전트 네이밍 패턴을 유지하면서 최소 범위로 수정한다
- When changing workflow behavior, check whether `README.md`, `QE_CONVENTIONS.md`, or relevant docs under `docs/` also need updates / 워크플로 동작을 바꾸면 `README.md`, `QE_CONVENTIONS.md`, `docs/` 내 관련 문서도 함께 갱신할지 확인한다
- When changing install or packaging behavior, verify both npm package assets and Claude plugin assets are still coherent / 설치 또는 패키징 동작을 바꾸면 npm 패키지 자산과 Claude 플러그인 자산이 서로 일관적인지 확인한다
- When updating versions or release notes, change both `package.json` and `.claude-plugin/plugin.json` / 버전이나 릴리스 노트를 갱신할 때는 `package.json`과 `.claude-plugin/plugin.json`을 함께 수정한다
- Do not rename published skills, agents, or CLI entrypoints unless explicitly requested / 명시적 요청이 없으면 공개된 스킬, 에이전트, CLI 엔트리포인트 이름을 바꾸지 않는다

## Validation / 검증

- Use targeted validation first; this repo does not expose a single default test script in `package.json` / 우선 변경 범위에 맞는 타깃 검증을 수행한다. 이 저장소에는 `package.json`에 단일 기본 테스트 스크립트가 없다
- Relevant built-in checks include `npm run validate:ai-team` and direct script execution under `scripts/` / 기본 검증 수단으로는 `npm run validate:ai-team`과 `scripts/` 아래 직접 실행 가능한 스크립트가 있다
- If a change touches installation flow, review `install.js`, `uninstall.js`, and `scripts/lib/client_installers.mjs` / 변경이 설치 흐름에 영향을 주면 `install.js`, `uninstall.js`, `scripts/lib/client_installers.mjs`를 함께 확인한다

## Documentation / 문서

- Start with `README.md` for install and usage entry points / 설치와 사용 흐름은 `README.md`부터 확인한다
- Use `QE_CONVENTIONS.md` for QE-specific workflow and naming conventions / QE 고유의 워크플로와 네이밍 규칙은 `QE_CONVENTIONS.md`를 따른다
- Use `docs/DOCUMENTATION_MAP.md` when changes affect discoverability across docs / 문서 탐색성에 영향을 주는 변경이면 `docs/DOCUMENTATION_MAP.md`도 함께 확인한다

## Response Style / 응답 스타일

- Reply in English first, then add a Korean translation on the next line in parentheses / 먼저 영어로 답하고, 다음 줄에 소괄호로 한국어 번역을 적는다
- When useful, explain key words, phrases, or idioms in simple English with Korean meaning / 필요할 때는 주요 단어, 표현, 숙어의 뜻을 쉬운 영어와 한국어로 설명한다
- Keep English concise and learner-friendly unless the task requires a more technical tone / 특별히 더 기술적인 톤이 필요하지 않다면 영어는 간결하고 학습하기 쉽게 쓴다
