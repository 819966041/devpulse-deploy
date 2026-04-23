#!/bin/bash

echo "启动 DevPulse 社区服务器..."

# 检查是否已有进程在运行
if pgrep -f "next dev" > /dev/null; then
    echo "发现现有进程，终止中..."
    pkill -f "next dev"
    sleep 2
fi

# 清理旧的构建文件
if [ -d ".next" ]; then
    echo "清理旧的构建文件..."
    rm -rf .next
fi

# 启动服务器
echo "启动服务器..."
nohup npm run dev > dev.log 2>&1 &

# 等待服务器启动
sleep 5

# 检查服务器状态
if pgrep -f "next dev" > /dev/null; then
    echo "✅ 服务器启动成功"
    echo "📍 访问地址: http://localhost:3000/community"
    
    # 运行状态检查
    ./check-server.sh
    
    echo "📝 日志文件: dev.log"
    echo "🔧 使用 './check-server.sh' 检查服务器状态"
else
    echo "❌ 服务器启动失败"
    echo "请检查日志: tail -f dev.log"
    exit 1
fi