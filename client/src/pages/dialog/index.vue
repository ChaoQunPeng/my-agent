<template>
  <div class="chat-container">
    <div class="chat-messages" ref="messagesContainer">
      <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
        <div class="content">
          <div class="text">
            <div v-if="message.content" class="message-content" :class="{ 'deep-thinking-content': message.type === 'thinking' }">
              <div v-html="formatMessage(message.content)"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 流式消息显示 -->
      <!-- <div v-if="streamingMessage" class="message assistant streaming">
        <div class="avatar">
          <a-avatar
            :size="32"
            :style="{
              backgroundColor: streamingMessageType === 'thinking' ? '#9254de' : '#4a90e2'
            }"
          >
            <template #icon>
              <span>{{ streamingMessageType === 'thinking' ? '思考' : 'AI' }}</span>
            </template>
          </a-avatar>
        </div>
        <div class="content">
          <div class="text">
            <div class="message-content" :class="{ 'deep-thinking-streaming': streamingMessageType === 'thinking' }">
              {{ streamingMessage }}
            </div>
          </div>
        </div>
      </div> -->
    </div>

    <input-area @send="handleSend"></input-area>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { message as antMessage } from 'ant-design-vue'
// import UserAvatar from '@/components/user-avatar/index.vue';
import InputArea from './components/input-area.vue'
import { chatStreamApi } from '../../composables/chat-stream'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  thinking?: boolean
  searching?: boolean
  type?: 'dialog' | 'thinking' // 区分是对话还是深度思考
}

const messages = ref<ChatMessage[]>([])

const sending = ref(false)
const messagesContainer = ref<HTMLDivElement | null>(null)

// 格式化消息显示
const formatMessage = (content: string) => {
  // 简单的换行处理
  return content.replace(/\n/g, '<br>')
}

// 发送消息
const handleSend = async (text: string) => {
  if (!text.trim() || sending.value) return

  sending.value = true

  // 1. 添加用户消息
  messages.value.push({ role: 'user', content: text })
  await nextTick()
  scrollToBottom()

  // 2. 添加 AI 回复占位
  messages.value.push({ role: 'assistant', content: '' })
  const assistantIndex = messages.value.length - 1

  try {
    await chatStreamApi({
      message: text,
      onChunk: async (content: string) => {
        messages.value[assistantIndex].content += content
        await nextTick()
        scrollToBottom()
      },
    })
  } catch (e) {
    antMessage.error('消息发送失败，请稍后重试')
    // 移除空的 AI 占位消息
    if (!messages.value[assistantIndex]?.content) {
      messages.value.splice(assistantIndex, 1)
    }
  } finally {
    sending.value = false
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
  padding: 60px 0;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 800px;
  margin: 0 auto;

  /* 隐藏滚动条 */
  ::-webkit-scrollbar {
    display: none;
  }
  &::-webkit-scrollbar {
    display: none;
  }
}

.message {
  display: flex;
  gap: 12px;
  max-width: 100%;
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.avatar {
  flex-shrink: 0;
}

.content {
  flex: 1;
  min-width: 0;
}

.text {
  position: relative;
}

.message-content {
  border-radius: 8px;
  line-height: 1.75;
  font-size: 16px;
  white-space: pre-wrap;
  word-break: break-word;
}

.message.user .message-content {
  background: #1890ff;
  color: white;
  border-top-right-radius: 0;
  padding: 6px 10px;
}

.message.assistant .message-content {
  background: white;
  border-top-left-radius: 0;
}

@media (max-width: 768px) {
  .chat-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}
</style>
