# Requirements: Framework-wide Audit & Sync (Milestone 3)

## 1. Skill Meta-Data Synchronization (스킬 메타데이터 동기화)
- [ ] **Frontmatter Update**: 모든 `SKILL.md` 파일에 `invocation_trigger` 및 `recommendedModel` 필드 추가.
- [ ] **Trigger Refinement**: 각 스킬의 실제 역할에 부합하는 정교한 호출 트리거 문구 작성.
- [ ] **Model Tiering Realignment**: `AGENT_TIERS.md` 표준에 따른 스킬별 권장 모델 재배치.

## 2. Agent Instruction Optimization (에이전트 지침 최적화)
- [ ] **ContextMemo Enforcement**: 모든 에이전트 지침(`agents/*.md`)에 `ContextMemo` 확인 및 활용 로직 명시.
- [ ] **Prompt Debloating**: `Etask-executor.md` 등 비대한 지침 파일의 세부 로직을 `references/`로 분리하여 컨텍스트 절약.
- [ ] **Compliance Audit**: `AGENT_BASE.md`의 표준 원칙이 개별 에이전트 지침과 충돌하지 않는지 전수 검사.

## 3. Redundant Logic Consolidation (중복 로직 통합)
- [ ] **CLAUDE.md I/O Unification**: `Qrun-task`, `Mmigrate-tasks`, `Qinit` 등에서 중복되는 CLAUDE.md 읽기/쓰기 로직을 `unified-state` 기반 유틸리티로 통합.
- [ ] **Legacy Metrics Removal**: `tool_call` 횟수 기반의 구형 지표를 사용하는 모든 로직을 토큰 기반 지표로 전환.

## 4. Skills Directory Cleanup (스킬 디렉토리 정리)
- [ ] **Redundancy Filter**: Sonnet 3.5 이상의 모델에서 더 이상 필요하지 않은 단순 `coding-experts` 스킬들 식별 및 정리 제안.
- [ ] **Category Re-organization**: 스킬들을 더 명확한 카테고리로 재분류하여 에이전트의 탐색 효율 증대.
