#!/bin/bash

# 检查社区页面是否正常工作
echo "检查 DevPulse 社区页面状态..."

# 检查页面标题
TITLE=$(curl -s "http://localhost:3000/community" | grep -o "DevPulse" | head -1)
if [ "$TITLE" = "DevPulse" ]; then
    echo "✅ 页面标题正常: DevPulse"
else
    echo "❌ 页面标题异常"
    exit 1
fi

# 检查今日必读内容
DAILY=$(curl -s "http://localhost:3000/community" | grep -o "今日必读" | head -1)
if [ "$DAILY" = "今日必读" ]; then
    echo "✅ 今日必读内容正常"
else
    echo "❌ 今日必读内容异常"
    exit 1
fi

# 检查日期显示
DATE=$(curl -s "http://localhost:3000/community" | grep -o "2026-04-20" | head -1)
if [ "$DATE" = "2026-04-20" ]; then
    echo "✅ 日期显示正常: 2026-04-20"
else
    echo "❌ 日期显示异常"
    exit 1
fi

# 检查主要文章内容
ARTICLE=$(curl -s "http://localhost:3000/community" | grep -o "OpenAI发布GPT-5预览版" | head -1)
if [ "$ARTICLE" = "OpenAI发布GPT-5预览版" ]; then
    echo "✅ 主要文章内容正常"
else
    echo "❌ 主要文章内容异常"
    exit 1
fi

echo "🎉 所有检查通过！DevPulse 社区页面运行正常"