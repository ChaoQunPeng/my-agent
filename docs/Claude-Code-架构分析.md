# Claude Code 架构分析

## 目录

- [一、提示词生成系统](#一提示词生成系统)
  - [1.1 整体入口：三路并行获取](#11-整体入口三路并行获取)
  - [1.2 主 System Prompt：getSystemPrompt()](#12-主-system-promptgetsystemprompt)
  - [1.3 用户上下文：getUserContext()](#13-用户上下文getusercontext)
  - [1.4 系统上下文：getSystemContext()](#14-系统上下文getsystemcontext)
  - [1.5 最终组装：buildEffectiveSystemPrompt()](#15-最终组装buildeffectivesystemprompt)
  - [1.6 API 层最后注入](#16-api-层最后注入)
  - [1.7 关键设计亮点](#17-关键设计亮点)
- [二、工具系统](#二工具系统)
  - [2.1 Tool 接口：一个工具要实现什么](#21-tool-接口一个工具要实现什么)
  - [2.2 buildTool()：工厂函数，默认值兜底](#22-buildtool工厂函数默认值兜底)
  - [2.3 工具的文件结构](#23-工具的文件结构)
  - [2.4 权限系统深度：以 BashTool 为例](#24-权限系统深度以-bashtool-为例)
  - [2.5 MCP 工具：开放世界的代理](#25-mcp-工具开放世界的代理)
  - [2.6 ToolSearchTool：工具懒加载机制](#26-toolsearchtool工具懒加载机制)
  - [2.7 ToolUseContext：工具运行时的全局状态包](#27-tooluseontext工具运行时的全局状态包)
  - [2.8 工具分类总览](#28-工具分类总览)
  - [2.9 设计亮点总结](#29-设计亮点总结)
- [三、核心查询循环](#三核心查询循环)
  - [3.1 架构概览](#31-架构概览)
  - [3.2 工具执行编排](#32-工具执行编排toolorchestrationts)
  - [3.3 工具执行流水线](#33-工具执行流水线toolexecutionts)
  - [3.4 上下文压缩（Compact）](#34-上下文压缩compact)
- [四、Hooks 系统](#四hooks-系统)
  - [4.1 什么是 Hook](#41-什么是-hook)
  - [4.2 Hook 事件类型](#42-hook-事件类型)
  - [4.3 Hook 类型](#43-hook-类型)
  - [4.4 Hook 的 if 条件过滤](#44-hook-的-if-条件过滤)
  - [4.5 Hook 返回值协议](#45-hook-返回值协议)
- [五、状态管理](#五状态管理)
  - [5.1 AppState 结构](#51-appstate-结构)
  - [5.2 Store 模式](#52-store-模式)
- [六、MCP 服务集成](#六mcp-服务集成)
  - [6.1 什么是 MCP](#61-什么是-mcp)
  - [6.2 连接方式](#62-连接方式)
  - [6.3 MCP 工具的生命周期](#63-mcp-工具的生命周期)
  - [6.4 MCP 认证](#64-mcp-认证)
  - [6.5 MCP 资源](#65-mcp-资源)
- [七、LSP 集成](#七lsp-集成)
  - [7.1 什么是 LSP](#71-什么是-lsp)
  - [7.2 架构](#72-架构)
  - [7.3 LSPClient 接口](#73-lspclient-接口)
  - [7.4 LSPDiagnosticRegistry](#74-lspdiagnosticregistry)
- [八、Skills 技能系统](#八skills-技能系统)
  - [8.1 什么是 Skill](#81-什么是-skill)
  - [8.2 Skill 文件格式](#82-skill-文件格式)
  - [8.3 Skill 的调用链](#83-skill-的调用链)
  - [8.4 动态技能发现](#84-动态技能发现)
- [九、多 Agent 与协调者模式](#九多-agent-与协调者模式)
  - [9.1 Agent 任务类型](#91-agent-任务类型)
  - [9.2 AgentTool：子 Agent 编排](#92-agenttool子-agent-编排)
  - [9.3 Coordinator 模式（Swarm）](#93-coordinator-模式swarm)
  - [9.4 In-Process Teammate](#94-in-process-teammate)
- [十、终端 UI 引擎（Ink）](#十终端-ui-引擎ink)
  - [10.1 架构概览](#101-架构概览)
  - [10.2 主要技术特性](#102-主要技术特性)
  - [10.3 帧率控制](#103-帧率控制)
- [十一、SDK 与扩展接口](#十一sdk-与扩展接口)
  - [11.1 Agent SDK](#111-agent-sdk)
  - [11.2 SDK 消息类型](#112-sdk-消息类型)
  - [11.3 Bridge 模式](#113-bridge-模式)
  - [11.4 插件系统](#114-插件系统)

---

## 一、提示词生成系统

### 1.1 整体入口：三路并行获取

每次 `QueryEngine.submitMessage()` 调用前，会通过 `fetchSystemPromptParts()` 并行拉取三块内容，互不阻塞：

```typescript
// src/utils/queryContext.ts
const [defaultSystemPrompt, userContext, systemContext] = await Promise.all([
  getSystemPrompt(tools, mainLoopModel, ...),  // 主 System Prompt
  getUserContext(),                             // 用户上下文（CLAUDE.md + 日期）
  getSystemContext(),                           // 系统上下文（git 状态）
])
```

### 1.2 主 System Prompt：`getSystemPrompt()`

**文件：** `src/constants/prompts.ts`

System Prompt 以**字符串数组**形式组装，分为**静态区**和**动态区**两段，中间用边界标记 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 分割。

#### 静态区（所有用户共享，可全局 Prompt Cache）

| 顺序 | Section 函数 | 内容 |
|------|-------------|------|
| ① | `getSimpleIntroSection()` | 身份定义：辅助软件工程任务的交互 Agent |
| ② | `getSimpleSystemSection()` | 基础规则：工具被拒绝时的行为、Markdown 格式、Hooks 说明 |
| ③ | `getSimpleDoingTasksSection()` | 编程规范：不过度实现、不加无谓注释、安全编码 |
| ④ | `getActionsSection()` | 安全执行：可逆 vs 不可逆操作区分，高风险操作须先确认 |
| ⑤ | `getUsingYourToolsSection()` | 工具使用指导：优先用专用工具而非 Bash，并行调用指导 |
| ⑥ | `getSimpleToneAndStyleSection()` | 输出风格：禁用 emoji、显示文件路径格式 |
| ⑦ | `getOutputEfficiencySection()` | 简洁原则：直接回答、减少废话 |
| 🔴 | `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` | **分界线**，之后内容不参与全局缓存 |

#### 动态区（每个 Session 独立，通过 Section 注册表管理）

动态 Section 通过 `systemPromptSection()` 注册，**首次计算后在 session 内缓存**，`/clear` 或 `/compact` 时清除：

```typescript
// src/constants/systemPromptSections.ts

// 普通动态 section：session 内缓存，不破坏 Prompt Cache
export function systemPromptSection(name, compute): SystemPromptSection

// 危险的不缓存 section：每轮重算，会破坏 Prompt Cache，需要说明原因
export function DANGEROUS_uncachedSystemPromptSection(name, compute, reason)
```

| Section 名 | 内容 | 是否每轮重算 |
|-----------|------|------------|
| `session_guidance` | AskUser/AgentTool/Skill/验证 Agent 使用指导 | 否 |
| `memory` | `CLAUDE.md` 全文内容（记忆注入） | 否 |
| `env_info_simple` | CWD、是否 Git、平台、OS、模型名称 | 否 |
| `language` | 语言偏好（如"始终用中文回复"） | 否 |
| `output_style` | 插件定义的输出风格 | 否 |
| `mcp_instructions` | MCP 服务器的自定义使用说明 | **是**（服务器随时连接/断开）|
| `token_budget` | Token 预算说明 | 否 |

### 1.3 用户上下文：`getUserContext()`

**文件：** `src/context.ts`，用 `memoize` 缓存，整个会话只读一次。

```
返回：{
  claudeMd:    "CLAUDE.md 文件的完整内容",   // 项目记忆，类似 .cursorrules
  currentDate: "Today's date is 2026-04-07."
}
```

`CLAUDE.md` 的查找路径从当前工作目录逐层向上，类似 `.gitignore` 查找逻辑。

### 1.4 系统上下文：`getSystemContext()`

**文件：** `src/context.ts`，同样用 `memoize` 缓存，整个会话只查一次 Git。

```typescript
// 注入到模型的 Git 状态内容
return [
  `This is the git status at the start of the conversation.`,
  `Current branch: ${branch}`,
  `Main branch (you will usually use this for PRs): ${mainBranch}`,
  `Git user: ${userName}`,
  `Status:\n${truncatedStatus}`,  // 超 2000 字符会截断，提示用 BashTool 查看
  `Recent commits:\n${log}`,      // git log --oneline -n 5
].join('\n\n')
```

### 1.5 最终组装：`buildEffectiveSystemPrompt()`

**文件：** `src/utils/systemPrompt.ts`，按优先级决定最终用哪个 System Prompt：

```
优先级（高 → 低）：
  overrideSystemPrompt      （循环模式覆盖）
       ↓
  coordinatorSystemPrompt   （Swarm 协调者模式）
       ↓
  agentSystemPrompt         （指定了 --agent 类型）
       ↓
  customSystemPrompt        （用户 --system-prompt 指定）
       ↓
  defaultSystemPrompt       （标准 Claude Code 提示词）

+ appendSystemPrompt        （末尾追加，始终生效）
```

### 1.6 API 层最后注入

在真正发请求前，`buildSystemPromptBlocks()` 还会在最前面注入几段内容：

```typescript
// src/services/api/claude.ts
systemPrompt = asSystemPrompt([
  getAttributionHeader(fingerprint),                         // 归因头（标识 session）
  getCLISyspromptPrefix({ ... }),                            // CLI 前缀说明
  ...systemPrompt,                                           // 主 System Prompt
  ...(advisorModel ? [ADVISOR_TOOL_INSTRUCTIONS] : []),      // Advisor 工具说明
  ...(injectChromeHere ? [CHROME_TOOL_SEARCH_INSTRUCTIONS] : []),
].filter(Boolean))
```

### 1.7 关键设计亮点

| 设计点 | 说明 |
|--------|------|
| **全局 Prompt Cache** | 静态区对所有用户相同，使用 Anthropic `scope: 'global'` 缓存，跨 org 共享，大幅降低 token 成本 |
| **Section 注册表** | 动态 Section 懒计算 + session 内复用，只有 `DANGEROUS_uncached` 标记的才每轮重算 |
| **三路并行** | `getSystemPrompt` / `getUserContext` / `getSystemContext` 并行拉取，不互相等待 |
| **CLAUDE.md 记忆** | 项目级自定义规则，等价于 `.cursorrules`，是用户定制 Claude 行为的主要入口 |
| **工具描述独立传递** | 工具能力通过 API `tools` 参数传递，System Prompt 里只有"如何选择工具"的策略说明 |

---

## 二、工具系统

### 2.1 Tool 接口：一个工具要实现什么

`src/Tool.ts` 定义了完整接口，一个工具同时承担 **4 个角色**：

#### 执行层（核心）

```typescript
call(
  args: z.infer<Input>,
  context: ToolUseContext,        // 完整执行环境（state/abort/工具列表等）
  canUseTool: CanUseToolFn,       // 运行时权限判断
  parentMessage: AssistantMessage,
  onProgress?: ToolCallProgress,  // 流式进度回调
): Promise<ToolResult<Output>>
```

#### 权限层（安全）

```typescript
validateInput(input, context)    → ValidationResult   // 第一关：格式/合法性检查
checkPermissions(input, context) → PermissionResult   // 第二关：权限决策
isReadOnly(input)                // 是否只读
isDestructive(input)             // 是否不可逆（删除/覆盖/发送）
```

权限决策结果共 4 种：

```typescript
type PermissionResult =
  | { behavior: 'allow' }           // 直接允许
  | { behavior: 'deny'; message }   // 直接拒绝，告知模型原因
  | { behavior: 'ask'; ... }        // 弹出 UI 让用户确认
  | { behavior: 'passthrough' }     // 交给通用权限系统处理
```

#### 渲染层（UI）

```typescript
renderToolUseMessage(input, opts)          // 工具调用开始时显示（input 可能是 Partial）
renderToolUseProgressMessage(progMsgs)     // 工具运行中实时进度
renderToolResultMessage(content, ...)      // 工具执行完毕显示结果
renderToolUseRejectedMessage(input, ...)   // 用户拒绝时显示
renderGroupedToolUse(toolUses, ...)        // 多个同类工具并行时合并显示
```

> 注意：`renderToolUseMessage` 接收 `Partial<Input>`，因为工具参数**流式传输时还没传完就开始渲染**。

#### 描述层（告诉模型自己是谁）

```typescript
prompt(options)        // 完整说明，写入 API 的 tools 参数
description(input)     // 单次调用的描述文字
userFacingName(input)  // 终端显示的名字（可随入参动态变化）
searchHint             // 3-10 词的能力短语，供 ToolSearch 关键词索引用
```

### 2.2 `buildTool()`：工厂函数，默认值兜底

开发者只需写 `ToolDef`（不完整定义），`buildTool()` 用 **fail-closed（默认保守）** 原则填充：

```typescript
// src/Tool.ts
const TOOL_DEFAULTS = {
  isEnabled:          () => true,
  isConcurrencySafe:  () => false,   // 默认不可并发
  isReadOnly:         () => false,   // 默认有写操作
  isDestructive:      () => false,
  checkPermissions:   () => Promise.resolve({ behavior: 'allow' }), // 交给通用权限系统
  toAutoClassifierInput: () => '',   // 默认不参与 auto mode 安全分类
  userFacingName:     () => '',
}

export function buildTool<D extends AnyToolDef>(def: D): BuiltTool<D> {
  return { ...TOOL_DEFAULTS, userFacingName: () => def.name, ...def } as BuiltTool<D>
}
```

### 2.3 工具的文件结构

每个工具都是一个独立文件夹，**垂直自包含**，互不干扰：

```
src/tools/BashTool/
├── BashTool.tsx          ← 核心逻辑（call / validateInput / inputSchema）
├── bashPermissions.ts    ← 权限专项：Bash AST 解析 + 规则匹配（2600+ 行）
├── bashSecurity.ts       ← 安全检查：危险命令识别
├── commandSemantics.ts   ← 命令语义识别（读/写/破坏性）
├── prompt.ts             ← 给模型的说明文字
├── UI.tsx                ← 所有渲染方法
├── sedEditParser.ts      ← sed 命令特殊解析
└── constants.ts          ← 工具名常量
```

### 2.4 权限系统深度：以 BashTool 为例

BashTool 的权限检查最为复杂，`bashPermissions.ts` 超过 2600 行：

```
用户调用 bash("rm -rf /tmp/foo")
       ↓
1. validateInput()
   ├─ 沙箱模式检查
   └─ 路径合法性检查
       ↓
2. checkPermissions()
   ├─ checkPermissionMode()       ← Plan Mode？只读模式？
   ├─ checkPathConstraints()      ← 路径是否在允许目录内
   ├─ checkSedConstraints()       ← sed 命令特殊校验
   ├─ matchWildcardPattern()      ← 匹配 alwaysDeny / alwaysAllow 规则
   ├─ parseForSecurity()          ← 解析 Bash AST（检测命令注入、重定向）
   └─ classifyBashCommand()       ← AI 分类器（auto mode 下自动决策）
```

三层防御体系：

```
第 1 层：规则匹配（alwaysAllow / alwaysDeny / alwaysAsk 配置）
       ↓ 没有匹配规则
第 2 层：工具自身 checkPermissions()（只读？破坏性？AST 解析？）
       ↓ 需要询问
第 3 层：用户交互确认 UI（弹出权限对话框）
```

特殊模式：

| 模式 | 说明 |
|------|------|
| **Auto Mode** | AI 分类器自动判断是否允许，无需用户确认 |
| **Plan Mode** | 进入只读计划模式，禁止实际写操作 |
| **dangerouslySkipPermissions** | 完全跳过权限检查（沙箱/CI 环境用） |

### 2.5 MCP 工具：开放世界的代理

`MCPTool` 是个"模板工具"，自身几乎没有实现，所有核心方法在 `mcpClient.ts` 里运行时动态覆盖：

```typescript
// src/tools/MCPTool/MCPTool.ts
export const MCPTool = buildTool({
  isMcp: true,
  name: 'mcp',           // 运行时覆盖为真实 MCP 工具名：mcp__服务器名__工具名
  async call() { ... },  // 运行时覆盖为调用 MCP 服务器的实际逻辑
  async prompt() { ... } // 运行时覆盖为 MCP 服务器提供的说明文字
})
```

每接入一个 MCP 服务器，就动态生成一批 `MCPTool` 的实例，命名格式：`mcp__{服务器名}__{工具名}`。

### 2.6 `ToolSearchTool`：工具懒加载机制

当工具数量很多时（尤其接了很多 MCP 服务器），把所有工具描述塞进 System Prompt 会消耗大量 token。`ToolSearchTool` 解决这个问题：

**流程：**

```
1. 大部分工具标记为 shouldDefer: true → 不放进初始 System Prompt
       ↓
2. 模型调用 ToolSearch("关键词") → 按名称/描述评分排序返回匹配工具名
       ↓
3. 匹配结果以 tool_reference 块返回 → 模型拿到工具定义后即可调用
```

**搜索打分规则：**

| 匹配位置 | 得分（MCP / 普通）|
|---------|----------------|
| 工具名精确分词匹配 | 12 / 10 |
| 工具名部分匹配 | 6 / 5 |
| `searchHint` 关键词匹配 | 4 |
| 描述文本词边界匹配 | 2 |

支持 `select:工具名` 直接精确选择，逗号分隔可多选。

### 2.7 `ToolUseContext`：工具运行时的全局状态包

每次 `call()` 都会收到 `ToolUseContext`，封装了工具执行时需要的一切：

| 字段 | 用途 |
|------|------|
| `options.tools` | 所有可用工具列表 |
| `options.mcpClients` | 已连接的 MCP 服务器列表 |
| `abortController` | 用户中断信号（Ctrl+C）|
| `readFileState` | 文件读取 LRU 缓存，防止重复读取 |
| `getAppState / setAppState` | React 全局状态读写 |
| `setToolJSX` | 在终端渲染工具专属自定义 UI |
| `messages` | 完整对话历史 |
| `agentId` | 子 Agent 标识（主线程无此字段）|
| `contentReplacementState` | 大输出结果的磁盘存储管理（超限自动落盘）|
| `requestPrompt` | 向用户发起交互式提问的回调（仅 REPL 模式）|

### 2.8 工具分类总览

| 类别 | 工具 | 说明 |
|------|------|------|
| **文件类** | FileRead / FileWrite / FileEdit / Glob / Grep / NotebookEdit | 文件系统读写操作 |
| **Shell 类** | BashTool / PowerShellTool | 系统命令执行，含沙箱 |
| **Agent 类** | AgentTool / SendMessageTool / TaskCreate/Update/List/Stop | 多 Agent 编排与任务管理 |
| **网络类** | WebFetch / WebSearch | HTTP 请求与搜索 |
| **扩展类** | MCPTool / LSPTool / SkillTool | MCP 协议、语言服务器、技能扩展 |
| **元工具** | ToolSearchTool / AskUserQuestionTool / EnterPlanModeTool / ConfigTool | 控制 Claude 自身行为 |
| **定时类** | CronCreate / CronDelete / CronList | 定时任务调度 |

### 2.9 设计亮点总结

| 设计点 | 说明 |
|--------|------|
| **接口统一** | 40+ 个工具都实现同一个 `Tool` 接口，运行时完全可替换 |
| **默认保守** | `buildTool` 的 `TOOL_DEFAULTS` 全部 fail-closed，安全第一 |
| **垂直自包含** | 每个工具一个文件夹，逻辑/权限/UI/描述完全独立 |
| **流式渲染** | 工具参数未传完即开始渲染（`Partial<Input>`） |
| **输出大小保护** | `maxResultSizeChars` 超限后自动存磁盘，模型只看预览 |
| **工具懒加载** | `shouldDefer` + `ToolSearchTool` 避免大量工具撑爆 System Prompt |
| **MCP 开放扩展** | MCPTool 作为动态代理，外部服务接入无需改源码 |
| **Bash AST 解析** | BashTool 权限检查解析真实 AST，而非简单字符串匹配，防命令注入 |

---

## 三、核心查询循环

### 3.1 架构概览

**文件：** `src/query.ts`（1730 行）

`query()` 是系统的发动机，是一个 **AsyncGenerator**，驱动着与 Claude API 的多轮对话循环：

```
query() 主循环
  ├─ 构建消息列表（prepareMessages）
  ├─ 调用 Claude API（streamResponse）
  ├─ 处理流式响应 → yield StreamEvent
  ├─ 发现 tool_use → 转交 runTools()
  │    ├─ 并发安全工具 → 并行执行（最多 10 个）
  │    └─ 非并发安全工具 → 顺序执行
  ├─ 工具结果追加到消息列表 → 继续下一轮 API 调用
  └─ 收到 end_turn / 超出 maxTurns → 结束生成
```

### 3.2 工具执行编排：`toolOrchestration.ts`

工具调度的核心逻辑在 `runTools()`，它将一批并行的 `tool_use` 调用按并发安全性分组：

```typescript
// src/services/tools/toolOrchestration.ts
for (const { isConcurrencySafe, blocks } of partitionToolCalls(toolUseMessages)) {
  if (isConcurrencySafe) {
    // 并行批次：同时执行所有只读工具
    for await (const update of runToolsConcurrently(blocks, ...)) { ... }
  } else {
    // 顺序批次：一个一个执行写操作工具
    for await (const update of runToolsSequentially(blocks, ...)) { ... }
  }
}
```

分组规则：相邻的 `isConcurrencySafe=true` 工具被归为同一批并行执行，遇到任何 `isConcurrencySafe=false` 的工具就切换为顺序模式。最大并发数默认 **10**，可通过 `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` 环境变量调整。

### 3.3 工具执行流水线：`toolExecution.ts`

单个工具从调用到返回的完整流水线（`runToolUse()`）：

```
1. 反序列化 & 验证输入（zod schema）
2. validateInput()               ← 工具自定义合法性检查
3. executePreToolUseHooks()      ← PreToolUse Hooks（可修改输入/拒绝执行）
4. canUseTool()                  ← 权限决策（规则匹配 + UI 确认）
5. tool.call()                   ← 实际执行，流式 onProgress 回调
6. executePostToolUseHooks()     ← PostToolUse Hooks（可修改输出）
7. mapToolResultToToolResultBlockParam() ← 序列化结果供下轮 API 调用
8. 超出 maxResultSizeChars → 落盘，结果替换为预览文本
```

### 3.4 上下文压缩（Compact）

**文件：** `src/services/compact/`

当对话历史接近模型 Context Window 上限时，自动触发压缩：

```typescript
// 触发阈值：context_window - 20000（为输出预留 token）
function getEffectiveContextWindowSize(model: string): number {
  return getContextWindowForModel(model) - MAX_OUTPUT_TOKENS_FOR_SUMMARY // 20000
}
```

**压缩流程：**

```
检测 token 超出阈值
       ↓
executePreCompactHooks()          ← 用户自定义 PreCompact Hook
       ↓
compactConversation()
  ├─ 生成对话摘要（fork 一个子 Agent 专门做摘要）
  ├─ 保留摘要 + 最近几条消息
  └─ 丢弃中间历史
       ↓
executePostCompactHooks()         ← 用户自定义 PostCompact Hook
       ↓
清除 System Prompt Section 缓存（/clear 语义）
重置 Prompt Cache 边界
```

压缩支持多种策略：
- **autoCompact**：token 自动触发
- **microCompact**：轻量压缩，只压缩单条超大工具结果
- **apiMicrocompact**：服务端触发的压缩
- **sessionMemoryCompact**：压缩时提取记忆写入 CLAUDE.md

---

## 四、Hooks 系统

### 4.1 什么是 Hook

**文件：** `src/utils/hooks.ts`（5000+ 行）

Hooks 是用户在 Claude Code 生命周期各节点插入自定义逻辑的机制，本质是**在特定事件发生时执行一段 Shell 命令或 LLM Prompt**，可以：
- 修改工具的输入/输出
- 阻止工具执行
- 向模型注入额外上下文
- 触发外部通知

### 4.2 Hook 事件类型

| Hook 事件 | 触发时机 | 能力 |
|-----------|---------|------|
| `PreToolUse` | 工具执行前 | 可修改输入、阻止执行 |
| `PostToolUse` | 工具执行后 | 可修改输出 |
| `PostToolUseFailure` | 工具执行失败后 | 错误处理 |
| `PermissionDenied` | 权限被拒绝后 | 记录/通知 |
| `Stop` | 模型输出 end_turn 后 | 可强制继续对话 |
| `StopFailure` | Stop Hook 执行失败 | 错误处理 |
| `UserPromptSubmit` | 用户提交消息前 | 可注入上下文 |
| `SessionStart` | 会话启动时 | 初始化逻辑 |
| `SessionEnd` | 会话结束时 | 清理/保存 |
| `SubagentStart` | 子 Agent 启动时 | 监控 |
| `SubagentStop` | 子 Agent 完成时 | 收集结果 |
| `Notification` | 重要事件通知 | OS 通知、Slack 等 |
| `PreCompact` / `PostCompact` | 上下文压缩前后 | 自定义摘要逻辑 |
| `InstructionsLoaded` | CLAUDE.md 加载后 | 动态扩展指令 |

### 4.3 Hook 类型

```typescript
// src/schemas/hooks.ts

// 类型1：Shell 命令 Hook（最常用）
type BashCommandHook = {
  type: 'command'
  command: string       // 执行的 Shell 命令
  if?: string           // 过滤条件，如 "Bash(git *)"
  timeout?: number      // 超时秒数
  async?: boolean       // 异步执行（不阻塞模型）
  asyncRewake?: boolean // 异步执行，exit code 2 时唤醒模型
  once?: boolean        // 执行一次后自动移除
}

// 类型2：LLM Prompt Hook
type PromptHook = {
  type: 'prompt'
  prompt: string        // 用 $ARGUMENTS 占位符接收工具输入
  timeout?: number
}

// 类型3：Agent Hook（spawn 一个子 Agent 处理）
type AgentHook = {
  type: 'agent'
  prompt: string
}
```

### 4.4 Hook 的 `if` 条件过滤

Hook 支持用权限规则语法过滤触发条件，避免对每次工具调用都启动进程：

```
if: "Bash(git *)"        ← 只在 Bash 执行 git 开头的命令时触发
if: "Read(*.ts)"         ← 只在读取 .ts 文件时触发
if: "Edit(src/**)"       ← 只在编辑 src/ 下文件时触发
```

### 4.5 Hook 返回值协议

Shell Command Hook 通过 stdout 返回 JSON 与 Claude Code 通信：

```json
// 同步 Hook 输出（exit 0）
{
  "continue": true,          // false 则阻止工具执行
  "suppressOutput": false,   // 是否隐藏工具输出
  "updatedInput": { ... },   // 修改工具输入
  "decision": "approve",     // 权限决策：approve / reject / ask
  "reason": "..."            // 展示给用户的原因
}

// 异步 Hook 输出（配合 asyncRewake，exit code 2 唤醒模型）
{
  "type": "async",
  "hookId": "...",
  "message": "后台任务完成，请继续"
}
```

---

## 五、状态管理

### 5.1 AppState 结构

**文件：** `src/state/AppStateStore.ts`

`AppState` 是整个 UI 层的全局状态，用 `DeepImmutable<>` 包裹保证不可变性，通过自研 `createStore()` 管理（类 Zustand 模式）：

```typescript
type AppState = DeepImmutable<{
  settings: SettingsJson           // 用户设置
  verbose: boolean                 // 详细模式
  mainLoopModel: ModelSetting      // 当前模型
  toolPermissionContext: ToolPermissionContext  // 权限上下文
  thinkingEnabled: boolean         // 思考模式开关

  // UI 状态
  expandedView: 'none' | 'tasks' | 'teammates'
  statusLineText: string | undefined
  spinnerTip?: string

  // 远程模式
  remoteConnectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  replBridgeEnabled: boolean       // Always-on Bridge 状态

  // Speculation（预测性执行）
  // ... 详见 SpeculationState
}>
& {
  // 非 immutable 部分（含函数类型）
  tasks: { [taskId: string]: TaskState }
  mcp: { clients, tools, commands, resources }
  plugins: { enabled, disabled, commands, errors }
  todos: { [agentId: string]: TodoList }
  notifications: { current, queue }
}
```

### 5.2 Store 模式

```typescript
// src/state/store.ts
export function createStore(initialState, onChangeAppState?) {
  let state = initialState
  const listeners = new Set()

  return {
    getState: () => state,
    setState: (updater) => {
      const newState = updater(state)
      state = newState
      listeners.forEach(l => l())         // 通知所有订阅者
      onChangeAppState?.({ newState, oldState })
    },
    subscribe: (listener) => { ... }
  }
}
```

React 组件通过 `useSyncExternalStore` 订阅状态，保证与 React Concurrent Mode 兼容。子 Agent 的 `setAppState` 默认为 no-op（隔离），只有 `setAppStateForTasks` 才能写入全局 store（用于注册/清理后台任务）。

---

## 六、MCP 服务集成

### 6.1 什么是 MCP

Model Context Protocol（MCP）是 Anthropic 提出的开放协议，允许外部服务以标准化方式向 Claude 提供工具、资源和提示词模板。

**文件：** `src/services/mcp/`

### 6.2 连接方式

MCP 服务器支持 3 种传输协议：

| 传输类型 | 说明 | 典型场景 |
|---------|------|---------|
| `stdio` | 子进程 stdin/stdout | 本地 MCP 工具（如 filesystem、git） |
| `sse` | HTTP Server-Sent Events | 远程 HTTP MCP 服务 |
| `streamableHttp` | 双向 HTTP 流 | 新版远程 MCP 服务 |

### 6.3 MCP 工具的生命周期

```
MCP 服务器启动
       ↓
client.listTools()             ← 获取工具列表
       ↓
为每个工具创建 MCPTool 实例
  ├─ name: "mcp__{server}__{tool}"
  ├─ 覆盖 call() → client.callTool()
  ├─ 覆盖 prompt() → 服务器提供的描述
  └─ 覆盖 checkPermissions() → 通道权限检查
       ↓
注入到 AppState.mcp.tools      ← 合并进全局工具列表
       ↓
（工具可选 shouldDefer=true）  ← 走 ToolSearch 懒加载
```

### 6.4 MCP 认证

支持多种认证方式，按优先级：
1. **OAuth 2.0**（claude.ai MCP 服务使用）
2. **API Key**（Header 注入）
3. **环境变量扩展**（`${API_KEY}` 自动替换）

`McpAuthTool` 专门处理 OAuth 流程，引导用户完成浏览器授权。

### 6.5 MCP 资源

除工具外，MCP 还支持**资源（Resources）**：

- `ListMcpResourcesTool`：列出 MCP 服务器暴露的资源（文件、数据库表等）
- `ReadMcpResourceTool`：读取指定资源内容

---

## 七、LSP 集成

### 7.1 什么是 LSP

Language Server Protocol（LSP）是微软提出的编辑器/工具与语言服务器通信的标准协议。Claude Code 通过集成 LSP 获得精确的**代码诊断、符号查询、定义跳转**等能力。

**文件：** `src/services/lsp/`

### 7.2 架构

```
LSPTool（工具层）
       ↓
LSPServerManager          ← 管理多个语言服务器实例
       ↓
LSPServerInstance         ← 单个语言服务器的生命周期
       ↓
LSPClient                 ← 基于 vscode-jsonrpc 的通信客户端
       ↓
语言服务器进程（如 tsserver, pylsp）
```

### 7.3 LSPClient 接口

```typescript
// src/services/lsp/LSPClient.ts
type LSPClient = {
  start(command, args, options?): Promise<void>    // 启动语言服务器进程
  initialize(params): Promise<InitializeResult>    // 协议握手
  sendRequest(method, params): Promise<TResult>    // 发送 JSON-RPC 请求
  sendNotification(method, params): Promise<void>  // 发送通知（无需响应）
  onNotification(method, handler): void            // 订阅服务器推送通知
  stop(): Promise<void>                            // 关闭连接
}
```

### 7.4 LSPDiagnosticRegistry

`LSPDiagnosticRegistry` 订阅 `textDocument/publishDiagnostics` 通知，将诊断信息（错误/警告）缓存起来，供 `FileEditTool` 在文件修改后自动附加到工具结果中，让模型即时感知代码错误。

---

## 八、Skills 技能系统

### 8.1 什么是 Skill

Skill（技能）是用户定义的**可复用斜杠命令**，本质是一个带 YAML Frontmatter 的 Markdown 文件，存放在项目或用户配置目录下。

**文件：** `src/skills/loadSkillsDir.ts`

**目录查找逻辑：**

```
~/.claude/commands/           ← 用户全局技能
{project}/.claude/commands/   ← 项目级技能（优先级更高）
{additionalDirs}/.claude/commands/ ← 额外目录
```

### 8.2 Skill 文件格式

```markdown
---
description: "提交代码并生成规范的 commit message"
allowed-tools: Bash, Read
argument-hint: "[commit message 前缀]"
---

请帮我提交当前所有改动，commit message 格式遵循 Conventional Commits 规范。
$ARGUMENTS

先运行 git diff --staged 查看改动，再生成合适的 message。
```

Frontmatter 字段：

| 字段 | 说明 |
|------|------|
| `description` | 技能说明，显示在 `/help` 列表 |
| `allowed-tools` | 限制此技能可用的工具集 |
| `argument-hint` | 用户调用时的参数提示 |
| `model` | 覆盖默认模型 |
| `effort` | 努力级别（`low` / `medium` / `high`） |

### 8.3 Skill 的调用链

```
用户输入 /commit "fix bug"
       ↓
SkillTool.call()
       ↓
加载 .claude/commands/commit.md
       ↓
替换 $ARGUMENTS → "fix bug"
执行嵌入的 Shell 命令（frontmatter shell 块）
       ↓
将展开后的 Prompt 注入对话
       ↓
Claude 基于扩展后的 Prompt 执行任务
```

### 8.4 动态技能发现

`DiscoverSkillsTool`（实验特性）允许 Claude 在对话中途主动搜索相关技能，避免一开始就把所有技能描述塞入 System Prompt，和 `ToolSearchTool` 的懒加载思路一致。

---

## 九、多 Agent 与协调者模式

### 9.1 Agent 任务类型

**文件：** `src/tasks/types.ts`，`src/Task.ts`

| 任务类型 | 说明 |
|---------|------|
| `local_agent` | 本地子 Agent，独立上下文 |
| `local_bash` | 本地 Shell 后台任务 |
| `in_process_teammate` | 进程内协作 Agent，消息互通 |
| `remote_agent` | 远程 Agent（云端执行） |
| `local_workflow` | 本地工作流（多步骤任务） |
| `dream` | 推测模式（预测性执行） |
| `monitor_mcp` | MCP 服务监控任务 |

### 9.2 AgentTool：子 Agent 编排

`AgentTool` 是多 Agent 系统的核心，当 Claude 调用它时：

```
AgentTool.call()
       ↓
创建独立的 ToolUseContext（隔离上下文）
  ├─ 独立的 messages（不共享主线程对话历史）
  ├─ 独立的 abortController
  └─ 可配置的工具子集（allowedTools 过滤）
       ↓
runAgent()                     ← 启动子 Agent 的 query 循环
       ↓
子 Agent 完成 → 返回摘要给主线程
```

**Fork 子 Agent**（`isForkSubagentEnabled`）：子 Agent 在后台运行，主线程继续与用户对话，不阻塞 UI。

### 9.3 Coordinator 模式（Swarm）

**文件：** `src/coordinator/coordinatorMode.ts`

Coordinator 模式下，一个主 Agent 充当协调者，通过 `TeamCreateTool` 动态创建一批 Worker Agent，用 `SendMessageTool` 互相通信：

```
Coordinator Agent
  ├─ TeamCreateTool("worker-1", task1)   ← 创建 Worker 1
  ├─ TeamCreateTool("worker-2", task2)   ← 创建 Worker 2
  │
  ├─ SendMessageTool("worker-1", "开始分析") ← 发消息
  └─ 等待所有 Worker 完成 → 汇总结果
```

Coordinator 有专属工具集：
- `TeamCreateTool` / `TeamDeleteTool`：管理 Worker 生命周期
- `SendMessageTool`：向指定 Agent 发送消息
- `SyntheticOutputTool`：向主线程注入合成输出
- `TaskStopTool`：停止指定任务

### 9.4 In-Process Teammate

`in_process_teammate` 任务类型允许多个 Agent 在同一进程内运行，共享文件状态缓存（`readFileState`），消息通过 `mailbox` 机制传递，适合需要频繁协作的场景。

---

## 十、终端 UI 引擎（Ink）

### 10.1 架构概览

**文件：** `src/ink/`

Claude Code 自带一套定制版的 **Ink**（React for CLI）引擎，将 React 组件树渲染为终端字符矩阵。

核心渲染管线：

```
React 组件树
       ↓
自定义 React Reconciler（src/ink/reconciler.ts）
       ↓
虚拟 DOM → Yoga 布局引擎（Flexbox 算法）
       ↓
renderNodeToOutput()         ← 将布局结果转换为字符单元格矩阵
       ↓
writeDiffToTerminal()        ← diff 算法，只写入变化的字符
       ↓
Terminal stdout              ← 最终输出到终端
```

### 10.2 主要技术特性

| 特性 | 说明 |
|------|------|
| **Yoga 布局** | Facebook 的 Flexbox 布局引擎，支持完整 CSS Flexbox |
| **Diff 渲染** | 每帧只更新变化的字符单元格，高性能 |
| **Alt Screen** | 支持全屏模式（进入独立终端缓冲区）|
| **鼠标支持** | 支持鼠标点击、悬停（通过 hit-test）|
| **文本选择** | 支持键盘文本选择和复制 |
| **Kitty Keyboard** | 支持 Kitty 终端扩展键盘协议 |
| **超链接** | 支持终端超链接（OSC 8）|
| **全局搜索** | 终端内容搜索高亮（`searchHighlight.ts`）|
| **Bidi** | 双向文本支持（RTL 语言）|

### 10.3 帧率控制

```typescript
// src/ink/constants.ts
const FRAME_INTERVAL_MS = 16  // ~60fps

// 每帧：
// 1. React 重新渲染（如有 state 变化）
// 2. Yoga 计算布局
// 3. renderNodeToOutput 生成字符矩阵
// 4. diff 与上一帧比较
// 5. 写入 terminal 差异
```

---

## 十一、SDK 与扩展接口

### 11.1 Agent SDK

**文件：** `src/entrypoints/agentSdkTypes.ts`，`src/entrypoints/sdk/`

Claude Code 提供完整的 SDK 接口，允许以编程方式驱动 Claude Code（非交互模式）：

```typescript
// 核心 SDK 类型
import type { Options, Query, SDKMessage } from '@anthropic-ai/claude-code'

// 启动一个 SDK 会话
const session: SDKSession = await claude.createSession({
  systemPrompt: '...',
  tools: [...],
  model: 'claude-opus-4-6',
})

// 发送消息，异步迭代响应
for await (const message of session.query('帮我写一个排序算法')) {
  if (message.type === 'assistant') { ... }
  if (message.type === 'tool_use') { ... }
}
```

### 11.2 SDK 消息类型

`SDKMessage` 是 SDK 层的消息联合类型，包含：

| 类型 | 说明 |
|------|------|
| `assistant` | Claude 的文本/工具调用输出 |
| `user` | 用户消息（含工具结果）|
| `system` | 系统消息（会话元信息）|
| `result` | 会话最终结果（含 token 用量、cost）|

### 11.3 Bridge 模式

**文件：** `src/bridge/`

Bridge 允许终端里的 Claude Code 会话与 claude.ai 网页端实时同步：

```
本地 Claude Code CLI
       ↓ WebSocket
Claude.ai 服务端（replBridge）
       ↓ WebSocket
claude.ai 网页端（用户浏览器）
```

用户可以在网页端查看 Claude Code 的实时输出、批准权限请求、发送消息。这是 `--remote-control` 功能的底层支撑。

### 11.4 插件系统

**文件：** `src/services/plugins/`

插件是 Claude Code 最高层的扩展机制，一个插件可以包含：

```
plugin/
├── plugin.json         ← 插件元信息（name, version, description）
├── commands/           ← 自定义斜杠命令（等同于 Skills）
├── hooks/              ← Hook 配置
├── mcp.json            ← 内置的 MCP 服务器配置
└── settings.json       ← 插件级默认设置
```

插件安装后通过 `/reload-plugins` 热加载，无需重启。`PluginInstallationManager` 管理从 Marketplace 或本地安装插件的全流程。
