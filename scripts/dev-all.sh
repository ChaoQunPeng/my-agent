#!/bin/bash

# 同时启动 server 和 client 的开发服务器（分开的终端窗口）
# 
# 使用方法:
#   bash scripts/dev-all.sh
#   或赋予执行权限后：./scripts/dev-all.sh

echo "🚀 正在打开两个终端窗口分别启动 server 和 client..."
echo ""

# 检测操作系统并选择合适的终端命令
if [[ "$(uname)" == "Darwin" ]]; then
    # macOS 系统
    echo "📱 检测到 macOS 系统，使用 Terminal.app"
    
    # 获取项目根目录
    PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
    
    # 打开新终端窗口启动 server
    osascript <<EOF
tell application "Terminal"
    activate
    do script "cd '$PROJECT_ROOT' && pnpm --filter my-agent run start:dev"
end tell
EOF
    
    # 打开新终端窗口启动 client
    osascript <<EOF
tell application "Terminal"
    activate
    do script "cd '$PROJECT_ROOT' && pnpm --filter antdv-pro run dev"
end tell
EOF
    
elif [[ "$(uname)" == "Linux" ]]; then
    # Linux 系统 - 尝试常见的终端模拟器
    PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
    
    if command -v gnome-terminal &> /dev/null; then
        echo "🐧 检测到 GNOME Terminal"
        gnome-terminal -- bash -c "cd '$PROJECT_ROOT' && pnpm --filter my-agent run start:dev; exec bash"
        gnome-terminal -- bash -c "cd '$PROJECT_ROOT' && pnpm --filter antdv-pro run dev; exec bash"
    elif command -v konsole &> /dev/null; then
        echo "🎛️ 检测到 Konsole"
        konsole -e bash -c "cd '$PROJECT_ROOT' && pnpm --filter my-agent run start:dev; exec bash"
        konsole -e bash -c "cd '$PROJECT_ROOT' && pnpm --filter antdv-pro run dev; exec bash"
    elif command -v xterm &> /dev/null; then
        echo "📺 检测到 XTerm"
        xterm -e "bash -c 'cd \"$PROJECT_ROOT\" && pnpm --filter my-agent run start:dev; exec bash'" &
        xterm -e "bash -c 'cd \"$PROJECT_ROOT\" && pnpm --filter antdv-pro run dev; exec bash'" &
    else
        echo "❌ 未找到支持的终端模拟器，请在安装 gnome-terminal、konsole 或 xterm 后运行此脚本"
        exit 1
    fi
else
    echo "❌ 不支持的操作系统：$(uname)"
    echo "💡 当前仅支持 macOS 和 Linux"
    exit 1
fi

echo ""
echo "✅ 已打开两个终端窗口："
echo "   - Server: NestJS 后端服务 (my-agent)"
echo "   - Client: Vite 前端服务 (antdv-pro)"
echo ""
echo "⚠️  如需关闭服务，请在对应终端窗口按 Ctrl+C"
