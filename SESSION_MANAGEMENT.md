# 会话管理功能说明

## 功能概述

本功能实现了完整的会话管理系统，支持：
- ✅ 创建新会话（自动根据第一条消息生成标题）
- ✅ 查看会话列表（按更新时间倒序）
- ✅ 切换会话（加载对应的消息历史）
- ✅ 编辑会话标题
- ✅ 删除会话（同时删除关联的所有消息）
- ✅ 消息持久化存储到 MongoDB

## 技术架构

### 后端 (NestJS)

#### 数据模型

1. **Session Schema** (`server/src/modules/session/schemas/session.schema.ts`)
   - `sessionId`: 唯一标识符
   - `title`: 会话标题
   - `summary`: 会话摘要
   - `createdAt`, `updatedAt`: 时间戳

2. **Message Schema** (`server/src/modules/session/schemas/message.schema.ts`)
   - `sessionId`: 关联的会话ID
   - `role`: 角色（user/assistant/system）
   - `content`: 消息内容
   - `timestamp`: 时间戳

#### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/sessions` | 创建新会话 |
| GET | `/sessions` | 获取所有会话列表 |
| GET | `/sessions/:id` | 获取会话详情（含消息历史） |
| POST | `/sessions/:id` | 更新会话信息 |
| DELETE | `/sessions/:id` | 删除会话 |
| POST | `/sessions/:id/messages` | 添加消息到会话 |
| GET | `/sessions/:id/messages` | 获取会话的消息历史 |
| DELETE | `/sessions/:id/messages` | 清空会话消息 |

### 前端 (Vue 3 + TypeScript)

#### 组件结构

- `client/src/pages/dialog/index.vue`: 主聊天页面，包含左侧会话列表和右侧聊天区域
- `client/src/api/session.ts`: 会话相关的 API 接口封装

#### 主要功能

1. **会话列表侧边栏**
   - 固定宽度 280px
   - 顶部"新建会话"按钮
   - 列表项显示：标题、更新时间
   - 悬停显示操作菜单（编辑、删除）
   - 选中态高亮显示

2. **聊天区域**
   - 加载状态遮罩
   - 消息历史记录
   - 流式响应支持
   - 消息复制、重新生成

## 环境配置

### 1. MongoDB 配置

确保 MongoDB 正在运行，并在 `server/.env.local` 中配置：

```env
MONGODB_URI=mongodb://localhost:27017/my-agent
```

### 2. 启动服务

#### 后端
```bash
cd server
pnpm install
pnpm run start:dev
```

#### 前端
```bash
cd client
pnpm install
pnpm run dev
```

## 使用流程

1. **创建会话**
   - 点击左侧"新建会话"按钮
   - 系统自动创建会话并切换到该会话
   - 发送第一条消息后，标题会自动更新为消息内容的摘要

2. **切换会话**
   - 点击左侧列表中的任意会话
   - 右侧自动加载该会话的历史消息

3. **编辑会话**
   - 悬停在会话项上，点击"更多"按钮
   - 选择"编辑"，修改标题后保存

4. **删除会话**
   - 悬停在会话项上，点击"更多"按钮
   - 选择"删除"，确认后删除会话及所有消息

## 数据库集合

MongoDB 中会创建以下集合：

- `sessions`: 存储会话元数据
- `messages`: 存储消息历史

## 注意事项

1. **会话标题生成**: 当发送第一条用户消息时，系统会自动截取前20个字符作为会话标题
2. **消息同步**: 每条消息发送后会立即保存到后端，确保数据不丢失
3. **并发控制**: 切换会话时会自动中止当前正在进行的请求
4. **错误处理**: 所有 API 调用都有 try-catch 保护，失败时会弹出提示

## 后续优化建议

1. **标题生成优化**: 可以调用 AI API 生成更智能的会话标题
2. **分页加载**: 当消息数量较多时，实现消息的分页加载
3. **搜索功能**: 添加会话搜索功能
4. **用户隔离**: 如果需要多用户支持，添加 userId 字段并进行权限控制
5. **消息导出**: 支持将会话历史导出为文件
