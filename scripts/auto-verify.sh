#!/bin/bash
echo "🔍 Sonnet Inspector: Waiting for code changes..."
# src 폴더 내 파일이 변경될 때마다 실행 (프로젝트 구조에 따라 경로 조정 가능)
fswatch -o src/ | while read -r event; do
    echo "🔎 Code Change Detected! Sonnet starting verification..."
    # Claude CLI (Sonnet) 호출
    claude-cli "Review the recent changes in src/ and run tests. Summarize results in .qe/handoff/VERIFY_REPORT.md."
    echo "✅ Verification cycle finished. Monitoring for changes..."
done
