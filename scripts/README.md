# Scripts 脚本说明

本目录包含用于项目开发和管理的各种自动化脚本。

## 📜 可用脚本

### dev-all.sh
同时启动 server 和 client 的开发服务器（**分开的终端窗口**）。

**使用方法：**
```bash
# 方式一：直接运行（推荐）
bash scripts/dev-all.sh

# 方式二：赋予执行权限后运行
chmod +x scripts/dev-all.sh
./scripts/dev-all.sh
```

**功能特性：**
- 🚀 在两个独立的终端窗口中分别启动服务
- 💻 自动检测操作系统（macOS / Linux）
- 🔔 每个服务独立运行，互不干扰
- ⚠️ 可以单独控制每个服务的启停
- 💡 无需额外依赖，纯 shell 实现
- 🎨 清晰的命令行输出提示

**启动的服务：**
- **Server**: NestJS 后端服务 (在新的终端窗口中运行 `pnpm run start:dev`)
- **Client**: Vite 前端服务 (在新的终端窗口中运行 `pnpm run dev`)

**支持的操作系统：**
- ✅ macOS - 使用 Terminal.app
- ✅ Linux - 支持 GNOME Terminal、Konsole、XTerm

## 添加新脚本

如需添加新的脚本，请遵循以下规范：

1. 在 `scripts` 目录创建新的 `.sh` 文件
2. 使用 Shebang (`#!/bin/bash`) 声明为 bash 脚本
3. 在文件顶部添加注释说明脚本用途和使用方法
4. 确保脚本有执行权限：`chmod +x scripts/xxx.sh`
5. 更新本文档说明使用方法

## 常用命令速查

```bash
# 同时启动 server 和 client (推荐)
bash scripts/dev-all.sh

# 只启动 server
cd server && pnpm run start:dev

# 只启动 client  
cd client && pnpm run dev

# 赋予脚本执行权限
chmod +x scripts/*.sh
```

## 技术说明

- 使用 `pnpm --filter` 参数在 monorepo 中定位具体项目
- 使用后台进程 (`&`) 并行启动多个服务
- 使用 `trap` 捕获退出信号，确保优雅关闭所有服务
- 纯 shell 实现，无额外依赖，跨平台兼容性好
