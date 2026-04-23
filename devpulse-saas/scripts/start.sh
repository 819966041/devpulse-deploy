#!/bin/bash
# DevPulse AI — 启动模式切换

echo "============================================"
echo "  DevPulse AI — 启动模式切换"
echo "============================================"
echo ""
echo "  1. 平台版 (SaaS)  — 完整功能，定价/订阅/Stripe"
echo "  2. 社区版 (Community) — 极简免费，无定价/无仪表盘"
echo ""
read -p "请输入选择 (1 或 2): " mode

if [ "$mode" = "1" ]; then
    echo ""
    echo "[启动] 平台版 SaaS 模式..."
    export NEXT_PUBLIC_APP_MODE=saas
    npx next dev -p 3000
elif [ "$mode" = "2" ]; then
    echo ""
    echo "[启动] 社区版 Community 模式..."
    echo ""
    echo "📌 访问地址: http://localhost:3000/community"
    echo ""
    export NEXT_PUBLIC_APP_MODE=community
    npx next dev -p 3000
else
    echo "无效选择，请重新运行。"
fi
