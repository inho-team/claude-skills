# HYBRID_WORKFLOW: The Qplan PSE Model

이 문서는 `qe-framework`의 최신 **Qplan PSE(Plan-Spec-Execute)** 루프를 3개 모델(Opus, Gemini, Sonnet) 하이브리드로 구현하는 가이드를 제공합니다.

## 1. 하이브리드 3중주 체계

우리는 프로젝트의 라이프사이클을 세 단계로 나누어 각각 최적의 모델에 맡깁니다.

### [Phase 1] PLAN (The Brain: Opus) - 중앙 패널
- **역할:** Chief Architect & PM
- **도구:** `/Qplan`
- **산출물:** `.qe/planning/ROADMAP.md`, `.qe/planning/phases/{X}/PLAN.md`
- **강점:** Opus의 고차원적 전략 수립 및 의존성 파악 능력을 활용합니다.

### [Phase 2] SPEC & EXECUTE (The Hands: Gemini) - 좌측 패널 (Auto)
- **역할:** Implementation Specialist
- **트리거:** `/Qplan`이 내부적으로 호출하는 **Qgs**가 `TASK_REQUEST.md`를 생성하는 순간
- **산출물:** 실제 코드 소스 (Modified source files)
- **강점:** Gemini의 거대 컨텍스트를 활용하여 복잡한 `TASK_REQUEST`를 프로젝트 전체와 대조하며 정확하게 구현합니다.

### [Phase 3] VERIFY (The Eyes: Sonnet) - 우측 패널 (Auto)
- **역할:** Quality Assurance
- **트리거:** 소스코드 수정 또는 `.qe/planning/phases/{X}/VERIFY_CHECKLIST.md` 생성 시
- **산출물:** `.qe/planning/phases/{X}/VERIFICATION.md`, `.qe/logs/audit.json`
- **강점:** Sonnet의 빠른 응답과 논리적 엄밀함으로 즉각적인 피드백을 제공합니다.

---

## 2. 실전 사용 시나리오 (PSE Loop 실행)

1.  **중앙(Opus)에서 시작:** 
    - `/Qplan [새 기능 요구사항]` 입력
    - Opus가 로드맵과 1단계 계획(`PLAN.md`)을 작성합니다.
2.  **좌측(Gemini)이 자동으로 응답:** 
    - Opus가 `TASK_REQUEST.md`를 저장하는 순간, 좌측 패널의 Gemini가 즉시 깨어나 **실제 코딩**을 시작합니다.
3.  **우측(Sonnet)이 최종 검증:** 
    - 코드가 수정되면 우측 패널의 Sonnet이 **테스트와 정적 분석**을 수행하여 녹색 불(PASS)을 띄웁니다.

---

## 3. 핵심 규칙 (The Gold Rules)

- **One Entry Point:** 모든 작업은 항상 중앙 패널에서 **`/Qplan`**으로 시작합니다.
- **No Manual Code:** 직접 코드를 고치는 대신, 계획을 수정하여 AI 군단이 다시 코드를 짜게 하십시오.
- **Traceability:** 모든 코드는 반드시 `TASK_REQUEST.md`의 체크리스트 항목 중 하나와 연결되어야 합니다.

---
*이 워크플로우는 Qplan 마스터 오케스트레이터의 철학을 기반으로 설계되었습니다.*
