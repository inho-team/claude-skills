#!/bin/bash
echo "🤖 Gemini Implementer: Waiting for Qplan/Qgs updates in .qe/planning/..."
# .qe/planning 하위의 모든 TASK_REQUEST.md 파일 감시
fswatch -o .qe/planning/ | while read -r event; do
    # 가장 최근에 수정된 TASK_REQUEST.md 찾기
    LATEST_TASK=$(find .qe/planning/phases -name "TASK_REQUEST.md" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    
    if [ -f "$LATEST_TASK" ]; then
        echo "📝 New Atomic Spec Detected: $LATEST_TASK"
        echo "Gemini starting implementation..."
        node scripts/qe-gemini-bridge.mjs Etask-executor | gemini-cli "Read $LATEST_TASK and implement the code changes. Follow QE PSE standards."
        echo "✅ Implementation finished for $LATEST_TASK"
    fi
done
