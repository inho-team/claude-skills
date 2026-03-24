#!/bin/bash
echo "🔍 Sonnet Inspector: Monitoring .qe/planning/ for checklists and src/ for code changes..."

# .qe/planning(체크리스트)과 src(소스코드) 폴더를 동시에 감시
fswatch -o .qe/planning/ src/ | while read -r event; do
    # 가장 최근에 생성된 VERIFY_CHECKLIST.md 찾기
    LATEST_CHECKLIST=$(find .qe/planning/phases -name "VERIFY_CHECKLIST.md" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    
    if [ -f "$LATEST_CHECKLIST" ]; then
        echo "🔎 New Verify Checklist Detected: $LATEST_CHECKLIST"
        echo "Sonnet starting precision audit..."
        # Sonnet 실행: 체크리스트를 기반으로 코드 변화 검증
        claude-cli "Read the verification checklist at $LATEST_CHECKLIST and audit the recent changes in src/. Run tests if required and generate .qe/planning/phases/$(basename $(dirname $LATEST_CHECKLIST))/VERIFICATION.md report."
        echo "✅ Verification cycle finished for $(basename $(dirname $LATEST_CHECKLIST))"
    else
        # 체크리스트가 없는 일반 코드 수정의 경우 기본 검증 수행
        echo "🔎 Code Change Detected! Sonnet starting quick review..."
        claude-cli "Review the recent changes in src/ for bugs, style issues, and potential regressions. Summarize in the terminal."
        echo "✅ Quick review finished."
    fi
done
