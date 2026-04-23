#!/bin/bash
echo "============================================"
echo "  🆓 DevPulse AI — 社区版 (Community)"
echo "  极简免费: 示例日报/一键注册/无定价"
echo "============================================"
echo ""
echo "📌 访问地址: http://localhost:3000/community"
echo ""
export NEXT_PUBLIC_APP_MODE=community
npx next dev -p 3000
