# 项目结构说明文档

## 📋 项目概述

**my-agent** 是一个基于 Vue3 + NestJS 的全栈应用项目，采用前后端分离架构。前端使用 Ant Design Vue Pro 作为基础框架，后端使用 NestJS 构建 RESTful API 服务。

### 技术栈

#### 前端技术栈
- **核心框架**: Vue 3.5.x (Composition API)
- **UI 组件库**: Ant Design Vue 4.2.x
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由管理**: Vue Router 4.x
- **HTTP 客户端**: Axios
- **CSS 框架**: UnoCSS (原子化 CSS)
- **国际化**: Vue I18n
- **包管理器**: pnpm
- **TypeScript**: 全面支持

#### 后端技术栈
- **核心框架**: NestJS 11.x
- **数据库**: MongoDB (Mongoose ORM)
- **AI 集成**: OpenAI SDK
- **验证库**: class-validator, class-transformer
- **配置管理**: @nestjs/config, dotenv
- **TypeScript**: 全面支持

---

## 🌳 完整目录树结构

```
my-agent/
│
├── .git/                              # Git 版本控制目录
├── PROJECT_STRUCTURE.md               # 项目结构说明文档
│
├── client/                            # ========== 前端项目目录 ==========
│   ├── src/                           # 源代码目录
│   │   ├── api/                       # API 接口层 - 所有与后端交互的接口定义
│   │   ├── assets/                    # 静态资源目录
│   │   ├── components/                # 公共可复用组件
│   │   ├── composables/               # 组合式函数（Vue 3 Hooks）
│   │   ├── config/                    # 配置文件
│   │   ├── directive/                 # 自定义指令
│   │   ├── enums/                     # TypeScript 枚举定义
│   │   ├── layouts/                   # 布局组件
│   │   ├── locales/                   # 国际化配置
│   │   ├── pages/                     # 页面组件 - 具体业务页面
│   │   ├── router/                    # 路由配置
│   │   ├── stores/                    # Pinia 状态管理
│   │   └── utils/                     # 工具函数库
│   │
│   ├── public/                        # 公共资源目录
│   ├── servers/                       # Mock 服务器（Nitro）
│   ├── plugins/                       # Vite 插件
│   ├── scripts/                       # 构建脚本
│   ├── themes/                        # 主题配置
│   └── types/                         # TypeScript 类型定义
│
├── server/                            # ========== 后端项目目录 ==========
│   ├── src/                           # 源代码目录
│   │   ├── common/                    # 公共模块
│   │   ├── modules/                   # 业务模块
│   │   │   ├── character/             # 角色管理模块
│   │   │   ├── chat/                  # 聊天模块
│   │   │   ├── novel-context/         # 小说上下文模块
│   │   │   ├── session/               # 会话管理模块
│   │   │   └── task/                  # 任务管理模块
│   │   └── shared/                    # 共享模块
│   │
│   └── test/                          # 测试目录
│
├── scripts/                           # ========== 项目级脚本 ==========
│
└── docs/                              # ========== 项目文档 ==========
```

---

## 🔍 详细说明

### 前端结构 (client/)

#### 1. 核心目录 (src/)

##### **api/** - API 接口层
存放所有与后端交互的 API 接口定义，按功能模块划分：
- `common/` - 通用接口
- `dashboard/` - 仪表盘相关接口
- `list/` - 列表相关接口
- `character.ts` - 角色管理接口
- `novel-context.ts` - 小说上下文接口
- `session.ts` - 会话管理接口
- `task.ts` - 任务管理接口
- `test.ts` - 测试接口

##### **assets/** - 静态资源
存放全局样式文件、图片、字体等静态资源。

##### **components/** - 公共组件
可复用的 UI 组件库，包括：
- 权限控制组件
- 基础加载组件
- 页面容器组件
- 用户头像组件
- 虚拟列表组件
- 各种链接组件（文档、Gitee、GitHub）
- 图标组件集合
- 底部工具栏和链接组件

##### **composables/** - 组合式函数
Vue 3 Composition API 的逻辑复用单元（Hooks），包括：
- 权限判断相关逻辑
- Ant Design Token 管理
- API 请求封装和拦截器
- 授权认证逻辑
- 流式聊天 SSE 处理逻辑
- 表格查询逻辑封装
- 主题切换逻辑
- 国际化语言切换
- 全局配置管理
- 加载状态管理
- 页面标题管理
- 响应式断点查询
- 当前路由信息获取

##### **config/** - 配置文件
存放应用的默认配置项，如布局设置、主题配置等。

##### **directive/** - 自定义指令
Vue 自定义指令，包括权限指令（v-access）、加载指令（v-loading）等。

##### **enums/** - 枚举定义
TypeScript 枚举定义，包括 HTTP 状态码、加载状态、任务状态等枚举。

##### **layouts/** - 布局组件
页面整体布局模板，包括：
- 基础布局（侧边栏+顶部+内容区）
- 布局子组件（header、sider、footer等）
- 多标签页布局组件

##### **locales/** - 国际化配置
多语言配置，包括中文、英文等语言包文件和国际化初始化配置。

##### **pages/** - 页面组件
具体的业务页面，按功能模块组织，包括：
- **access/** - 权限管理页面
- **account/** - 账户管理页面（个人中心、设置）
- **agent/** - 智能体管理页面
- **case-search/** - 案例搜索页面
- **common/** - 通用页面（登录、注册、404等）
- **comps/** - 组件演示页面
- **contract-review/** - 合同审查页面
- **contract-search/** - 合同搜索页面
- **dashboard/** - 仪表盘页面（数据统计、图表）
- **dialog/** - 对话页面（AI 聊天界面）
- **document-drafting/** - 文档起草页面
- **elemental-conversion/** - 元素转换页面
- **exception/** - 异常页面（403、404、500）
- **form/** - 表单页面（基础表单、高级表单）
- **knowledge-base/** - 知识库页面
- **legal-regulatory-search/** - 法律法规搜索页面
- **list/** - 列表页面（基础列表、卡片列表等）
- **marketplace/** - 市场页面（应用市场）
- **menu/** - 菜单管理页面
- **my-team/** - 我的团队页面
- **profile/** - 个人资料页面
- **result/** - 结果页面（成功、失败）
- **self/** - 个人空间页面
- **task/** - 任务管理页面

##### **router/** - 路由配置
Vue Router 路由配置，包括：
- 常量路由（固定路由）
- 动态路由（根据权限生成）
- 路由生成逻辑
- 路由守卫（权限验证、登录检查）
- 路由模块定义
- 静态路由配置

##### **stores/** - 状态管理 (Pinia)
Pinia 状态管理模块，包括：
- 应用全局状态（布局、主题等）
- 布局菜单状态（展开/收起）
- 多标签页状态管理
- 用户信息状态（token、用户资料）

##### **utils/** - 工具函数库
通用工具函数，包括：
- HTTP 请求封装（axios 实例）
- 通用工具函数（日期格式化、数据转换等）
- 树形结构处理工具
- 加载状态工具函数
- 路由监听工具
- 页面气泡背景效果
- 常量定义

#### 2. 配置和构建文件

##### **public/** - 公共资源
静态公共资源目录，直接复制到构建输出目录，包括应用运行时配置和加载动画脚本。

##### **servers/** - Mock 服务器
基于 Nitro 的本地 Mock 服务器，用于开发环境模拟后端数据，包含各种接口的 Mock 路由定义。

##### **plugins/** - Vite 插件
Vite 插件配置，包括构建信息显示插件等。

##### **scripts/** - 构建脚本
辅助脚本工具，包括生成目录树、生成 UnoCSS 配置、TypeScript 转 JavaScript 等脚本。

##### **themes/** - 主题配置
Ant Design + UnoCSS 主题变量配置和颜色主题变量说明。

##### **types/** - TypeScript 类型定义
TypeScript 类型声明文件，包括自动导入类型、组件类型、环境变量类型、路由类型扩展等。

#### 3. 主要配置文件

- **package.json**: 前端依赖管理和脚本命令配置
- **vite.config.ts**: Vite 构建工具配置
- **tsconfig.json**: TypeScript 编译配置
- **unocss.config.ts**: UnoCSS 原子化 CSS 配置
- **eslint.config.ts**: ESLint 代码规范配置
- **index.html**: HTML 入口文件
- **Dockerfile**: Docker 镜像构建配置
- **default.conf**: Nginx 服务器配置
- **vercel.json**: Vercel 平台部署配置
- **pnpm-lock.yaml**: pnpm 依赖锁定文件
- **pnpm-workspace.yaml**: pnpm 工作区配置

#### 4. 文档文件

- **README.md**: 前端项目英文说明文档
- **README.zh-CN.md**: 前端项目中文说明文档
- **CHANGELOG.md**: 项目更新日志
- **SSE_CHAT_GUIDE.md**: SSE 流式聊天功能使用指南
- **SSE_DEMO_EXAMPLES.md**: SSE 流式响应示例代码

---

### 后端结构 (server/)

#### 1. 核心目录 (src/)

##### **common/** - 公共模块
跨模块共享的通用功能，包括：
- **dto/**: 数据传输对象，包含统一响应格式 DTO（ApiResponseDto）
- **filters/**: 异常过滤器，包含 HTTP 异常过滤器，用于全局异常处理

##### **modules/** - 业务模块
按功能划分的业务模块，每个模块遵循 NestJS 标准结构（Controller、Service、Repository、DTO、Schema、Module）：

###### **character/** - 角色管理模块
管理 AI 角色的配置和信息，包括角色的创建、查询、更新、删除等功能。

###### **chat/** - 聊天模块
核心聊天功能模块，包括：
- 集成 OpenAI API
- 实现 SSE (Server-Sent Events) 流式响应
- 聊天记录管理
- 系统提示词配置

###### **novel-context/** - 小说上下文模块
管理小说创作的上下文信息，包括故事背景、人物设定、情节大纲等。

###### **session/** - 会话管理模块
管理用户与 AI 的对话会话，包括：
- 会话创建、查询、删除
- 消息记录存储
- 会话历史管理

###### **task/** - 任务管理模块
管理各种 AI 辅助任务，包括：
- 任务创建和跟踪
- 任务状态管理
- 任务结果存储

##### **shared/** - 共享模块
跨模块共享的服务和工具，包括数据库连接配置、共享服务、共享工具函数等。

##### **应用核心文件**
- **app.controller.ts**: 应用主控制器，处理根路由请求
- **app.service.ts**: 应用主服务
- **app.module.ts**: 应用主模块，聚合所有业务模块和共享模块
- **main.ts**: 应用入口文件，负责启动 NestJS 应用，配置端口、全局前缀、异常过滤器等

#### 2. 测试目录 (test/)
存放端到端测试（E2E）用例和 Jest 测试配置。

#### 3. 配置文件

- **package.json**: 后端依赖管理和脚本命令配置
- **nest-cli.json**: NestJS CLI 工具配置
- **tsconfig.json**: TypeScript 编译配置
- **tsconfig.build.json**: 构建时 TypeScript 配置
- **eslint.config.mjs**: ESLint 代码规范配置
- **pnpm-lock.yaml**: pnpm 依赖锁定文件
- **.env.local**: 本地环境变量配置（数据库连接、API Key 等敏感信息）
- **.prettierrc**: Prettier 代码格式化配置

#### 4. 文档文件

- **README.md**: 后端项目说明文档
- **AI_README.md**: AI 功能相关说明文档

---

## 🚀 开发指南

### 环境要求
- **Node.js**: >= 20.15.0
- **包管理器**: pnpm@10.17.1+
- **数据库**: MongoDB

### 安装依赖

```bash
# 安装前端依赖
cd client
pnpm install

# 安装后端依赖
cd server
pnpm install
```

### 启动开发服务器

#### 方式一：分别启动

```bash
# 启动后端（终端 1）
cd server
pnpm start:dev

# 启动前端（终端 2）
cd client
pnpm dev
```

#### 方式二：一键启动

```bash
# 在项目根目录执行
./scripts/dev-all.sh
```

### 构建生产版本

```bash
# 构建前端
cd client
pnpm build

# 构建后端
cd server
pnpm build
```

### 代码检查

```bash
# 前端代码检查
cd client
pnpm lint        # ESLint 检查并修复
pnpm typecheck   # TypeScript 类型检查
pnpm format      # Prettier 格式化

# 后端代码检查
cd server
pnpm lint        # ESLint 检查并修复
pnpm format      # Prettier 格式化
```

### 运行测试

```bash
cd server
pnpm test        # 单元测试
pnpm test:e2e    # 端到端测试
pnpm test:cov    # 测试覆盖率
```

---

## 📝 开发规范

### 前端规范

1. **组件命名**: 使用 PascalCase（如 `UserAvatar.vue`）
2. **文件命名**: 
   - 组件文件使用 kebab-case（如 `user-avatar.vue`）
   - 工具文件使用 kebab-case（如 `request.ts`）
3. **API 接口**: 统一在 `src/api/` 目录下按模块组织
4. **样式方案**: 优先使用 UnoCSS 原子化类名
5. **状态管理**: 使用 Pinia，避免直接使用 Vuex
6. **注释规范**: 所有代码必须添加中文注释

### 后端规范

1. **接口风格**: RPC 风格，统一使用 POST 请求
2. **请求格式**: JSON 格式的请求体
3. **响应格式**: 统一使用 `ApiResponseDto` 封装
4. **接口命名**: 使用 kebab-case（如 `/characters/create`）
5. **模块结构**: 每个模块包含 Controller、Service、DTO、Entity
6. **注释规范**: 所有代码必须添加中文注释

### Git 提交规范

遵循 Conventional Commits 规范：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

---

## 🔧 核心功能模块

### 前端核心功能

1. **权限管理**: 基于角色的访问控制（RBAC）
2. **多主题支持**: 支持亮色/暗色主题切换
3. **多布局模式**: 支持多种页面布局
4. **国际化**: 支持多语言切换
5. **动态路由**: 根据权限动态生成路由
6. **多标签页**: 支持多标签页浏览
7. **流式聊天**: 支持 SSE 流式响应展示
8. **Mock 数据**: 本地 Mock 服务器支持

### 后端核心功能

1. **用户认证**: JWT Token 认证
2. **会话管理**: 完整的会话生命周期管理
3. **AI 集成**: OpenAI API 集成，支持流式响应
4. **角色管理**: AI 角色配置和管理
5. **任务管理**: 异步任务管理和跟踪
6. **小说创作**: 小说上下文管理和创作辅助
7. **数据持久化**: MongoDB 数据存储
8. **异常处理**: 全局异常捕获和处理

---

## 📦 部署说明

### Docker 部署

前端已提供 Dockerfile，可使用 Docker 进行容器化部署：

```bash
# 构建镜像
docker build -t my-agent-client ./client

# 运行容器
docker run -p 80:80 my-agent-client
```

### Nginx 配置

项目提供了 `default.conf` 配置文件，可根据实际需求调整。

### 环境变量

后端使用 `.env.local` 文件管理环境变量，需要配置：
- 数据库连接地址
- OpenAI API Key
- JWT 密钥
- 其他敏感配置

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 UNLICENSED 许可证。

---

## 📞 联系方式

- **作者**: aibayanyu <aibayanyu@qq.com>
- **仓库**: antdv-pro/antdv-pro

---

## 🔄 更新日志

详见 [CHANGELOG.md](./client/CHANGELOG.md)

---

*最后更新时间: 2026-04-11*
