#!/bin/bash

# 세션 이름 설정
SESSION_NAME="qe-pro"

# 기존 세션이 있다면 종료
tmux kill-session -t $SESSION_NAME 2>/dev/null

# 1. 먼저 중앙에 위치할 [지휘소: Opus]를 생성합니다.
tmux new-session -d -s $SESSION_NAME "export MODEL=opus; export AI_ROLE=strategist; printf \"\033]2;[2] Opus: Strategist (Center)\033\\\\\"; zsh"

# 2. 중앙 패널의 '왼쪽(-b)'에 [작업실: Gemini]를 배치합니다.
tmux split-window -h -b -t $SESSION_NAME "export MODEL=gemini; export AI_ROLE=implementer; printf \"\033]2;[1] Gemini: Implementer (Left)\033\\\\\"; ./scripts/auto-implement.sh"

# 3. 중앙 패널의 '오른쪽'에 [검문소: Sonnet]를 배치합니다. (이제 패널이 3개가 됨)
tmux split-window -h -t $SESSION_NAME "export MODEL=sonnet; export AI_ROLE=inspector; printf \"\033]2;[3] Sonnet: Inspector (Right)\033\\\\\"; ./scripts/auto-verify.sh"

# 4. 화면을 균등하게 3등분
tmux select-layout -t $SESSION_NAME even-horizontal

# 5. 중앙 패널(Opus)로 포커스 이동 후 접속
tmux select-pane -t 1
tmux attach-session -t $SESSION_NAME
