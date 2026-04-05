<template>
  <div class="chat-messages" ref="messagesContainerRef">
    <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
      <div class="content">
        <div class="text">
          <!-- 显示消息内容 -->
          <div v-if="message.content" class="message-content" v-html="formatMessage(message.content)"></div>

          <!-- 显示加载状态 -->
          <div v-if="message.loading" class="loading-indicator">
            <a-spin size="small" />
            <span class="loading-text">{{ message.loadingText || '正在思考...' }}</span>
          </div>

          <!-- 消息操作按钮(仅助手消息) -->
          <div v-if="message.role === 'assistant' && message.content && !message.loading" class="message-actions">
            <a-tooltip title="复制">
              <a-button type="text" size="small" @click="handleCopy(message.content)">
                <template #icon><CopyOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="重新生成">
              <a-button type="text" size="small" @click="handleRegenerate(index)">
                <template #icon><ReloadOutlined /></template>
              </a-button>
            </a-tooltip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons-vue'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  loadingText?: string
}

interface Props {
  messages: ChatMessage[]
}

interface Emits {
  (e: 'copy', content: string): void
  (e: 'regenerate', index: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const messagesContainerRef = ref<HTMLDivElement | null>(null)

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

// 暴露滚动方法给父组件
const scrollToBottom = () => {
  if (messagesContainerRef.value) {
    messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
  }
}

defineExpose({
  scrollToBottom
})

// 处理复制
const handleCopy = (content: string) => {
  emit('copy', content)
}

// 处理重新生成
const handleRegenerate = (index: number) => {
  emit('regenerate', index)
}
</script>

<style scoped lang="less">
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
  border-radius: 8px;
  line-height: 1.75;
  font-size: 15px;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 10px 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message.user .message-content {
  background: #1890ff;
  color: white;
  border-top-right-radius: 4px;
}

.message.assistant .message-content {
  background: #f5f5f5;
  color: #262626;
  border-top-left-radius: 4px;
}

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

:deep(.inline-code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  color: #d73a49;
}

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
</style>
