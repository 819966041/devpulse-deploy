#!/bin/bash
# DevPulse AI 一键运行脚本
# 用法：
#   ./run-now.sh          # 完整采集+发送
#   ./run-now.sh collect  # 只采集不发送
#   ./run-now.sh send     # 只发送（用已有数据）

cd "$(dirname "$0")"

case "${1:-all}" in
  collect)
    echo ">>> 采集模式：只采集不发送"
    node send-digest.js --collect
    ;;
  send)
    echo ">>> 发送模式：只发送邮件"
    node send-digest.js --send-only
    ;;
  all|*)
    echo ">>> 完整模式：采集+发送"
    node send-digest.js --now
    ;;
esac
