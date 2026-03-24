#!/bin/bash
echo "🤖 Gemini Implementer: Waiting for TASK_REQUEST.md updates..."
# .qe/handoff/TASK_REQUEST.md 파일이 변경될 때마다 실행
fswatch -o .qe/handoff/TASK_REQUEST.md | while read -r event; do
    echo "📝 New Plan Detected! Gemini starting implementation..."
    # Gemini CLI 호출 (Bridge를 통해 에이전트 규칙 주입)
    node scripts/qe-gemini-bridge.mjs Etask-executor | gemini-cli "Read .qe/handoff/TASK_REQUEST.md and implement the code changes. Follow the QE standards strictly."
    echo "✅ Implementation cycle finished. Waiting for next plan..."
done
