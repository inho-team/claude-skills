# HYBRID_WORKFLOW: Gemini + Claude Multi-Model Strategy

이 문서는 `qe-framework`에서 Gemini의 광범위한 컨텍스트 분석 능력과 Claude의 정밀한 코딩 능력을 결합하여 생산성을 극대화하는 하이브리드 워크플로우를 정의합니다.

## 1. 개요 (Architecture)

`tmux`를 사용하여 터미널을 3개의 가로 패널로 분할하고, 각 패널에 특정 모델과 역할을 부여합니다.

| 패널 | 역할 | 담당 모델 | 주요 작업 |
| :--- | :--- | :--- | :--- |
| **Pane 1 (좌측)** | **The Architect** | Gemini | 코드베이스 분석, `TASK_REQUEST.md` (작업 지시서) 작성 |
| **Pane 2 (중앙)** | **The Engineer** | Claude | 지시서에 따른 정밀 코드 수정 및 구현 |
| **Pane 3 (우측)** | **The Reporter** | Claude | 구현 결과 검수, 테스트 확인, `WORK_REPORT.md` 작성 |

---

## 2. 세부 워크플로우 (Step-by-Step)

### Step 1: 계획 수립 (Gemini)
- **작업:** 사용자의 요구사항을 듣고 전체 프로젝트의 의존성을 분석합니다.
- **출력:** `.qe/handoff/TASK_REQUEST.md` 파일 생성.
- **강점:** 제미나이의 100만+ 토큰 컨텍스트를 통해 프로젝트 전체를 한눈에 파악하고 계획을 세웁니다.

### Step 2: 코드 구현 (Claude)
- **작업:** Gemini가 만든 지시서를 읽고 실제 소스코드를 수정합니다.
- **입력:** `.qe/handoff/TASK_REQUEST.md`
- **강점:** 클로드의 뛰어난 논리 구조와 코딩 스타일을 통해 버그 없는 깔끔한 코드를 작성합니다.

### Step 3: 검수 및 보고 (Claude)
- **작업:** 구현된 코드가 계획과 일치하는지 확인하고, 최종 보고서를 작성합니다.
- **출력:** `WORK_REPORT.md` (최종 브리핑)
- **강점:** 꼼꼼한 성격의 클로드를 통해 작업의 완성도를 높이고 문서화합니다.

---

## 3. 환경 설정 (Setup)

이 워크플로우를 즉시 시작하려면 터미널 설정이 필요합니다.

### tmux 설정 (`~/.tmux.conf`)
패널 상단에 역할 이름이 표시되도록 설정합니다.
```bash
set -g pane-border-status top
set -g pane-border-format " [ #P: #{pane_title} ] "
```

### 쉘 별칭 설정 (`~/.zshrc`)
`qe-hybrid` 명령어 하나로 3개 패널을 동시에 띄웁니다.
```bash
alias qe-hybrid='tmux new-session -s qe-hybrid "export AI_ROLE=planner; export MODEL=gemini; printf \"\033]2;Gemini: Planner\033\\\\\"; zsh" \; split-window -h "export AI_ROLE=executor; export MODEL=claude; printf \"\033]2;Claude: Executor\033\\\\\"; zsh" \; split-window -h "export AI_ROLE=reporter; export MODEL=claude; printf \"\033]2;Claude: Reporter\033\\\\\"; zsh" \; select-layout even-horizontal \; select-pane -t 0'
```

---

## 4. 사용 방법

1. 터미널에서 `qe-hybrid`를 입력합니다.
2. **좌측 패널**에서 제미나이에게 "기능 X를 위한 계획을 세워줘"라고 요청합니다.
3. 계획이 나오면 **중앙 패널**로 이동해 "계획서대로 코드를 짜줘"라고 요청합니다.
4. 구현이 완료되면 **우측 패널**에서 "최종 보고서를 써줘"라고 요청합니다.

---
*이 계획서는 사용자님의 아이디어를 바탕으로 Gemini CLI에 의해 작성되었습니다.*
