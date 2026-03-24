#!/bin/bash

# Qcron Daemon Engine
# Usage: ./qcron-daemon.sh [start|stop|list] [job_id] [interval] [mission]

ACTION=$1
JOB_ID=$2
INTERVAL=$3
MISSION=$4

QE_LOG_DIR=".qe/logs/qcron"
mkdir -p "$QE_LOG_DIR"

case $ACTION in
  start)
    SESSION_NAME="qcron-$JOB_ID"
    LOG_FILE="$QE_LOG_DIR/job-$JOB_ID.log"

    # 기존 세션이 있으면 종료
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null

    # 새로운 백그라운드 세션 생성 (-d: detached)
    tmux new-session -d -s "$SESSION_NAME" "
      echo \"[$(date)] Qcron Job $JOB_ID Started: $MISSION\" >> $LOG_FILE
      while true; do
        echo \"[$(date)] Running Mission: $MISSION\" >> $LOG_FILE
        # 실제 AI 에이전트 호출 (비대화형 모드)
        claude \"$MISSION. Save result summary to $LOG_FILE. Update heartbeat in .qe/logs/qcron/heartbeat-$JOB_ID\"
        
        echo \"[$(date)] Cycle finished. Sleeping for $INTERVAL seconds.\" >> $LOG_FILE
        sleep $INTERVAL
      done
    "
    echo "Qcron Job $JOB_ID started in background tmux session: $SESSION_NAME"
    ;;

  stop)
    SESSION_NAME="qcron-$JOB_ID"
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null
    echo "Qcron Job $JOB_ID stopped."
    ;;

  list)
    echo "--- Active Qcron Jobs (tmux sessions) ---"
    tmux ls | grep "qcron-"
    ;;

  *)
    echo "Usage: $0 [start|stop|list]"
    ;;
esac
