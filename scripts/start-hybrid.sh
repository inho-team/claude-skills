#!/bin/bash

# 세션 이름 설정
SESSION_NAME="qe-pro"

# 1. 프레임워크 본체 경로 (이 스크립트가 위치한 곳의 부모 폴더)
# 사용자님의 실제 경로로 고정합니다.
QE_FRAMEWORK_ROOT="/Users/jinsungkim/Desktop/Workspace/qe-framework"

# 2. 현재 사용자가 qph를 실행한 위치 (작업 대상 폴더)
TARGET_DIR=$(pwd)

# 기존 세션 종료
tmux kill-session -t $SESSION_NAME 2>/dev/null

# 1. 중앙 [Opus/User]: 현재 폴더(TARGET_DIR)에서 시작
tmux new-session -d -s $SESSION_NAME -c "$TARGET_DIR" "export MODEL=opus; export AI_ROLE=strategist; printf \"\033]2;[2] Command Center: $TARGET_DIR\033\\\\\"; zsh"

# 2. 좌측 [Gemini]: 자동 구현 (프레임워크 스크립트 절대 경로 호출)
tmux split-window -h -b -t 0 -c "$TARGET_DIR" "export MODEL=gemini; export AI_ROLE=implementer; printf \"\033]2;[1] Gemini: Implementer (Left)\033\\\\\"; $QE_FRAMEWORK_ROOT/scripts/auto-implement.sh"

# 3. 우측 [Sonnet]: 자동 검증 (프레임워크 스크립트 절대 경로 호출)
tmux split-window -h -t 1 -c "$TARGET_DIR" "export MODEL=sonnet; export AI_ROLE=inspector; printf \"\033]2;[3] Sonnet: Inspector (Right)\033\\\\\"; $QE_FRAMEWORK_ROOT/scripts/auto-verify.sh"

# 화면 균등 분할
tmux select-layout -t $SESSION_NAME even-horizontal

# 포커스 로직 (중앙)
tmux select-pane -t 0
tmux select-pane -R

# 세션 접속
tmux attach-session -t $SESSION_NAME
