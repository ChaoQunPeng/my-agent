# SSE 流式对话前端显示完善指南

## 📋 功能概览

本次更新完善了 SSE 推流后的前端显示功能,主要包括:

### ✨ 核心功能

1. **实时加载状态** - 显示"正在思考..."提示,提升用户体验
2. **消息格式化** - 支持基础 Markdown 渲染(代码块、行内代码、粗体、斜体)
3. **消息操作** - 复制内容、重新生成回复
4. **中断控制** - 支持手动停止生成,避免等待过久
5. **平滑动画** - 消息淡入效果,滚动自动跟随
6. **错误处理** - 完善的错误分类和友好提示
7. **并发控制** - 防止多个请求同时发送导致的竞态条件
8. **生命周期管理** - 组件卸载时自动清理未完成的请求

### 🎨 UI 优化

- 渐变色用户消息气泡
- 自定义滚动条样式
- 悬停显示操作按钮
- 响应式布局适配移动端
- 代码高亮显示
- **动态切换发送/停止按钮** - 根据状态智能切换图标

---

## 🚀 使用方法

### 基本使用

```vue
<template>
  <div class="chat-container">
    <div class="chat-messages" ref="messagesContainer">
      <!-- 消息列表 -->
      <div v-for="(message, index) in messages" :key="index" 
           :class="['message', message.role]">
        <!-- 消息内容 -->
      </div>
    </div>
    
    <!-- 输入区域 - 支持发送和停止 -->
    <input-area 
      @send="handleSend" 
      :sending="sending"
      @stop="stopGeneration"
    ></input-area>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'
import { chatStreamApi } from '../../composables/chat-stream'

const sending = ref(false)
const abortController = ref<AbortController | null>(null)

const handleSend = async (text: string) => {
  // 如果正在发送,先停止当前请求
  if (sending.value && abortController.value) {
    abortController.value.abort()
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  sending.value = true
  abortController.value = new AbortController()
  
  try {
    await chatStreamApi({
      message: text,
      signal: abortController.value.signal,
      onChunk: async (content: string) => {
        // 实时更新消息内容
        messages.value[assistantIndex].content += content
        await nextTick()
        scrollToBottom()
      },
      onError: (error) => {
        console.error('SSE 错误:', error)
      },
      onComplete: () => {
        console.log('流式传输完成')
      }
    })
  } catch (e: any) {
    if (e.name === 'AbortError') {
      antMessage.info('已停止生成')
    } else {
      antMessage.error('消息发送失败')
    }
  } finally {
    sending.value = false
    abortController.value = null
  }
}

const stopGeneration = () => {
  abortController.value?.abort()
}

// 组件卸载时清理
onUnmounted(() => {
  if (abortController.value) {
    abortController.value.abort()
  }
})
</script>
```

### 停止生成

用户可以通过以下方式停止生成:

1. **点击停止按钮** - 发送按钮在生成中会变成红色停止图标
2. **程序化停止** - 调用 `abortController.value.abort()`
3. **组件卸载** - 自动清理未完成的请求

---

## 🔄 生命周期管理详解

### 1. 请求生命周期

```typescript
// 1. 创建控制器
abortController.value = new AbortController()

// 2. 发起请求
await chatStreamApi({
  signal: abortController.value.signal,
  onChunk: (content) => { /* ... */ }
})

// 3. 正常完成或手动中止
abortController.value.abort() // 手动停止

// 4. 清理资源
abortController.value = null
```

### 2. 并发控制策略

```typescript
const handleSend = async (text: string) => {
  // 如果已有请求在进行,先中止它
  if (sending.value && abortController.value) {
    abortController.value.abort()
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // 创建新请求
  sending.value = true
  abortController.value = new AbortController()
  
  try {
    // ... 发送逻辑
  } finally {
    // 只有当前 controller 未被替换时才重置状态
    if (!abortController.value?.signal.aborted) {
      sending.value = false
      abortController.value = null
    }
  }
}
```

### 3. 组件卸载清理

```typescript
onUnmounted(() => {
  // 清理窗口事件监听器
  window.removeEventListener('resize', scrollToBottom)
  
  // 中止未完成的 SSE 请求
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
  
  // 重置状态
  sending.value = false
})
```

### 4. 错误处理中的生命周期

```typescript
try {
  await chatStreamApi({ /* ... */ })
} catch (e: any) {
  if (e.name === 'AbortError') {
    // 用户主动停止 - 静默处理或友好提示
    antMessage.info('已停止生成')
  } else {
    // 网络或服务器错误
    antMessage.error('消息发送失败')
  }
  
  // 清理空消息
  if (!messages.value[assistantIndex]?.content) {
    messages.value.splice(assistantIndex, 1)
  }
} finally {
  // 确保状态重置
  sending.value = false
  abortController.value = null
}
```

---

## 📦 文件结构

```
client/src/
├── composables/
│   └── chat-stream.ts          # SSE 流式请求封装
└── pages/
    └── dialog/
        ├── index.vue            # 聊天主页面
        └── components/
            └── input-area.vue   # 输入区域组件(含停止按钮)
```

---

## 🔧 配置说明

### 环境变量

确保 `.env` 文件中配置了 API 基础路径:

```env
VITE_APP_BASE_API_DEV=/api
```

### 后端接口

SSE 端点要求:
- **方法**: GET
- **路径**: `/chat/stream-message`
- **参数**: `message` (query string)
- **响应头**: `Content-Type: text/event-stream`
- **数据格式**: `data: {"data": "内容片段"}\n\n`

---

## 🎯 最佳实践

### 1. 消息状态管理

```typescript
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean        // 是否正在加载
  loadingText?: string     // 加载提示文本
}
```

### 2. 错误处理策略

```typescript
try {
  await chatStreamApi({ /* ... */ })
} catch (e: any) {
  if (e.name === 'AbortError') {
    // 用户主动停止
    antMessage.info('已停止生成')
  } else {
    // 网络或其他错误
    antMessage.error('消息发送失败')
  }
}
```

### 3. 性能优化

- 使用 `nextTick` 确保 DOM 更新后再滚动
- 大量消息时考虑虚拟滚动
- 避免在 `onChunk` 中执行耗时操作
- **及时中止未使用的请求** - 防止内存泄漏

### 4. 并发安全

```typescript
// ❌ 错误做法 - 可能导致竞态条件
const handleSend = async (text: string) => {
  sending.value = true
  await chatStreamApi({ /* ... */ })
  sending.value = false  // 可能被其他请求覆盖
}

// ✅ 正确做法 - 检查 controller 是否仍有效
const handleSend = async (text: string) => {
  const currentController = new AbortController()
  abortController.value = currentController
  
  try {
    await chatStreamApi({
      signal: currentController.signal,
      onChunk: (content) => {
        // 检查是否仍是当前请求
        if (abortController.value !== currentController) return
        // ... 处理内容
      }
    })
  } finally {
    // 只有当前 controller 仍有效时才重置
    if (abortController.value === currentController) {
      sending.value = false
      abortController.value = null
    }
  }
}
```

---

## 🌟 进阶功能(可选)

### 安装 Markdown 渲染库

如需完整的 Markdown 支持,可安装以下依赖:

```bash
pnpm add markdown-it @types/markdown-it
```

然后修改 `formatMessage` 函数:

```typescript
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

const formatMessage = (content: string) => {
  return md.render(content)
}
```

### 添加代码高亮

```bash
pnpm add highlight.js
```

```typescript
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

const md = new MarkdownIt({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch (__) {}
    }
    return ''
  }
})
```

---

## 🐛 常见问题

### Q1: 消息显示不完整?

**A**: 检查后端是否正确发送 `\n\n` 分隔符,以及前端是否正确解析 buffer。

### Q2: 滚动不流畅?

**A**: 确保在 `onChunk` 中使用 `await nextTick()` 和 `scrollToBottom()`。

### Q3: 如何支持多轮对话?

**A**: 在后端维护对话历史,前端只需发送当前消息即可。

### Q4: 如何处理大段代码?

**A**: 当前的正则表达式可能不够完善,建议使用专业的 Markdown 渲染库。

### Q5: 快速连续发送导致混乱?

**A**: 已实现并发控制,新请求会自动中止旧请求。但仍建议等待前一个请求完成再发送新的。

### Q6: 组件卸载后仍有内存泄漏?

**A**: 确保在 `onUnmounted` 中调用了 `abortController.value.abort()` 并移除了所有事件监听器。

---

## 📝 更新日志

### v1.1.0 (2026-04-04)

- ✅ 实现基础 SSE 流式接收
- ✅ 添加加载状态指示器
- ✅ 支持基础 Markdown 格式化
- ✅ 实现复制和重新生成功能
- ✅ 添加中断控制(AbortController)
- ✅ 优化错误处理和用户反馈
- ✅ 改进 UI 样式和动画效果
- ✅ 响应式布局适配
- 🆕 **添加停止按钮** - 发送中可点击停止
- 🆕 **并发控制** - 防止多个请求同时发送
- 🆕 **完善的生命周期管理** - 组件卸载自动清理

---

## 💡 后续优化方向

1. **虚拟滚动** - 处理大量消息时的性能优化
2. **消息持久化** - 将聊天记录保存到本地存储或数据库
3. **富媒体支持** - 图片、视频、文件等多媒体内容
4. **语音交互** - 语音转文字、文字转语音
5. **智能推荐** - 基于上下文的问题推荐
6. **主题切换** - 支持深色/浅色主题
7. **国际化** - 多语言支持
8. **请求队列** - 支持排队而非直接中止旧请求

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request!

---

## 📄 许可证

MIT License
