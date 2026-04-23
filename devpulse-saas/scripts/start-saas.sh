#!/bin/bash
echo "============================================"
echo "  🏢 DevPulse AI — 平台版 (SaaS)"
echo "  完整功能: 定价/订阅/Stripe/仪表盘"
echo "============================================"
echo ""
echo "📌 访问地址: http://localhost:3000"
echo ""
export NEXT_PUBLIC_APP_MODE=saas
npx next dev -p 3000
