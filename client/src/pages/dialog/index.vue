<template>
  <div class="chat-container">
    <div class="chat-messages" ref="messagesContainer">
      <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
        <div class="content">
          <div class="text">
            <!-- 显示消息内容 -->
            <div v-if="message.content" class="message-content" v-html="formatMessage(message.content)"></div>

            <!-- 显示加载状态 -->
            <div v-if="message.loading" class="loading-indicator">
              <a-spin size="small" />
              <span class="loading-text">{{ message.loadingText }}</span>
            </div>

            <!-- 消息操作按钮(仅助手消息) -->
            <div v-if="message.role === 'assistant' && message.content && !message.loading" class="message-actions">
              <a-tooltip title="复制">
                <a-button type="text" size="small" @click="copyMessage(message.content)">
                  <template #icon><CopyOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="重新生成">
                <a-button type="text" size="small" @click="regenerateMessage(index)">
                  <template #icon><ReloadOutlined /></template>
                </a-button>
              </a-tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>

    <input-area @send="handleSend" :sending="sending" @stop="stopGeneration"></input-area>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { message as antMessage } from 'ant-design-vue'
import { CopyOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons-vue'
import InputArea from './components/input-area.vue'
import { chatStreamApi } from '../../composables/chat-stream'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  loadingText?: string
}

const messages = ref<ChatMessage[]>([])
const sending = ref(false)
const messagesContainer = ref<HTMLDivElement | null>(null)
const abortController = ref<AbortController | null>(null)

// 格式化消息显示(支持简单的 Markdown)
const formatMessage = (content: string) => {
  if (!content) return ''

  let formatted = content
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 换行
    .replace(/\n/g, '<br>')

  return formatted
}

// 复制消息内容
const copyMessage = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    antMessage.success('已复制到剪贴板')
  } catch (error) {
    antMessage.error('复制失败')
  }
}

// 重新生成消息
const regenerateMessage = async (index: number) => {
  if (sending.value) return

  // 找到最近的用户消息
  let userMessageIndex = -1
  for (let i = index - 1; i >= 0; i--) {
    if (messages.value[i].role === 'user') {
      userMessageIndex = i
      break
    }
  }

  if (userMessageIndex === -1) {
    antMessage.warning('找不到对应的用户消息')
    return
  }

  // 删除当前的助手消息及之后的所有消息
  messages.value.splice(index)

  // 重新发送
  const userMessage = messages.value[userMessageIndex].content
  await handleSend(userMessage, true)
}

// 发送消息
const handleSend = async (text: string, isRegenerate = false) => {
  if (!text.trim()) return

  // 如果正在发送,先停止当前请求
  if (sending.value && abortController.value) {
    abortController.value.abort()
    // 等待一小段时间确保清理完成
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  sending.value = true

  // 创建新的 AbortController
  abortController.value = new AbortController()

  // 如果不是重新生成,添加用户消息
  if (!isRegenerate) {
    messages.value.push({ role: 'user', content: text })
  }

  // 添加 AI 回复占位(带加载状态)
  const assistantIndex = messages.value.length
  messages.value.push({
    role: 'assistant',
    content: '',
    loading: true,
    loadingText: ''
  })

  await nextTick()
  scrollToBottom()

  try {
    await chatStreamApi({
      message: text,
      signal: abortController.value.signal,
      onChunk: async (content: string) => {
        // 检查是否已中止
        if (!abortController.value) return

        // 第一次收到内容时,移除加载状态
        if (messages.value[assistantIndex]?.loading) {
          messages.value[assistantIndex].loading = false
          messages.value[assistantIndex].loadingText = undefined
        }

        messages.value[assistantIndex].content += content
        await nextTick()
        scrollToBottom()
      }
    })

    // 完成后移除加载状态(如果还没有内容)
    if (messages.value[assistantIndex]?.loading) {
      messages.value[assistantIndex].loading = false
      messages.value[assistantIndex].loadingText = undefined
    }
  } catch (e: any) {
    // 如果是被中止的,不显示错误
    if (e.name === 'AbortError') {
      antMessage.info('已停止生成')
    } else {
      antMessage.error('消息发送失败,请稍后重试')
    }

    // 移除空的 AI 占位消息
    if (!messages.value[assistantIndex]?.content) {
      messages.value.splice(assistantIndex, 1)
    } else {
      // 如果有部分内容,移除加载状态
      if (messages.value[assistantIndex]) {
        messages.value[assistantIndex].loading = false
        messages.value[assistantIndex].loadingText = undefined
      }
    }
  } finally {
    // 只有当前 controller 未被替换时才重置状态
    if (abortController.value?.signal.aborted !== true || !abortController.value) {
      sending.value = false
      abortController.value = null
    }
  }
}

// 停止生成
const stopGeneration = () => {
  if (abortController.value) {
    abortController.value.abort()
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 添加窗口大小变化时的处理
onMounted(() => {
  window.addEventListener('resize', scrollToBottom)
  scrollToBottom()
})

onUnmounted(() => {
  window.removeEventListener('resize', scrollToBottom)
  // 清理未完成的请求
  if (abortController.value) {
    abortController.value.abort()
  }
})

// 暴露停止生成方法给父组件(如果需要)
defineExpose({
  stopGeneration
})
</script>

<style lang="less" scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;

  /* 自定义滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #d9d9d9;
    border-radius: 3px;

    &:hover {
      background: #bfbfbf;
    }
  }
}

.message {
  display: flex;
  gap: 12px;
  max-width: 100%;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message.assistant {
  flex-direction: row;
}

.avatar {
  flex-shrink: 0;
}

.content {
  flex: 1;
  min-width: 0;
  max-width: 70%;
}

.message.user .content {
  display: flex;
  justify-content: flex-end;
}

.text {
  position: relative;
}

.message-content {
  border-radius: 12px;
  line-height: 1.75;
  font-size: 15px;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 12px 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message.user .message-content {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: white;
  border-top-right-radius: 4px;
}

.message.assistant .message-content {
  background: #f5f5f5;
  color: #262626;
  border-top-left-radius: 4px;
}

// 代码块样式
:deep(.code-block) {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;

  code {
    background: transparent;
    padding: 0;
    color: inherit;
  }
}

// 行内代码样式
:deep(.inline-code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  color: #d73a49;
}

// 加载状态
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  border-top-left-radius: 4px;
  color: #8c8c8c;
}

.loading-text {
  font-size: 14px;
}

// 消息操作按钮
.message-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s;

  .message:hover & {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .chat-messages {
    padding: 16px;
    gap: 16px;
  }

  .content {
    max-width: 85%;
  }

  .message-content {
    font-size: 14px;
    padding: 10px 12px;
  }
}
</style>
