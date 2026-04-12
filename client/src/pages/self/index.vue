<template>
  <div class="chat-page">
    <!-- 右侧聊天区域 -->
    <div class="chat-container">
      <div class="chat-messages" ref="messagesContainer">
        <MessageList ref="messageListRef" :messages="messages" @copy="copyMessage" @regenerate="regenerateMessage" />
      </div>

      <div>
        <!-- 增加清空对话 -->
        <input-area @send="handleNoRecordChat" :sending="sending" @stop="stopGeneration"></input-area>
      </div>
    </div>

    <!-- 素材区域 -->
    <div class="material-area">
      <!-- 设置面板：temperature和systemPrompt -->
      <div class="settings-panel">
        <a-divider orientation="left">对话设置</a-divider>

        <!-- Temperature 选择器 -->
        <div class="setting-item">
          <label class="setting-label">Temperature ({{ temperature }})</label>
          <a-slider v-model:value="temperature" :min="0" :max="2" :step="0.1" :marks="{ 0: '0', 1: '1', 2: '2' }" />
          <div class="setting-hint">控制生成的随机性，值越高越有创意</div>
        </div>

        <!-- System Prompt 输入框 -->
        <div class="setting-item">
          <label class="setting-label">系统提示词</label>
          <a-textarea v-model:value="systemPrompt" placeholder="输入自定义的系统提示词，留空则使用默认提示词" :rows="4" show-count />
        </div>

        <!-- 清空消息按钮 -->
        <div class="setting-item">
          <a-button danger block @click="handleClearMessages"> <DeleteOutlined /> 清空所有消息 </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'
import { message as antMessage, Modal } from 'ant-design-vue'
import { DeleteOutlined } from '@ant-design/icons-vue'
import InputArea from '@/components/chat/input-area.vue'
import MessageList from '@/components/chat/message-list.vue'
import { chatStreamNoRecordApi } from '../../composables/chat-stream'
import { clearTempMessages } from '../../api/session'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  loadingText?: string
}

// Temperature 设置 (0-2)
const temperature = ref<number>(0.7)

// System Prompt 设置
const systemPrompt = ref<string>('')

// 消息相关
const messages = ref<ChatMessage[]>([])
const sending = ref(false)
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)
const abortController = ref<AbortController | null>(null)

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
  await handleNoRecordChat(userMessage)
}

// 停止生成
const stopGeneration = () => {
  if (abortController.value) {
    abortController.value.abort()
    // 立即重置发送状态和控制器
    sending.value = false
    abortController.value = null
  }
}

/**
 * 不保存记录的对话（临时对话）
 * 此功能不会将消息保存到数据库，适合临时性对话和测试
 */
const handleNoRecordChat = async (text: string) => {
  if (!text.trim()) {
    antMessage.warning('请输入消息内容')
    return
  }

  // 如果正在发送,先停止当前请求
  if (sending.value && abortController.value) {
    abortController.value.abort()
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  sending.value = true
  abortController.value = new AbortController()

  // 添加用户消息（仅显示，不保存到后端）
  messages.value.push({ role: 'user', content: text })

  // 添加 AI 回复占位(带加载状态)
  const assistantIndex = messages.value.length
  messages.value.push({
    role: 'assistant',
    content: '',
    loading: true,
    loadingText: ''
  })

  await nextTick()
  messageListRef.value?.scrollToBottom()

  let fullReply = ''

  try {
    await chatStreamNoRecordApi({
      message: text,
      systemPrompt: systemPrompt.value || undefined,
      temperature: temperature.value,
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
        fullReply += content

        await nextTick()
        messageListRef.value?.scrollToBottom()
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

/**
 * 清空所有消息
 */
const handleClearMessages = async () => {
  Modal.confirm({
    title: '确认清空',
    content: '确定要清空所有消息吗？此操作不可恢复。',
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        // 调用后端接口清除临时会话
        await clearTempMessages()

        // 清空前端消息数组
        messages.value = []

        antMessage.success('已清空所有消息')
      } catch (error) {
        console.error('清空消息失败:', error)
        antMessage.error(error instanceof Error ? error.message : '清空消息失败')
      }
    }
  })
}

onUnmounted(() => {
  // 清理未完成的请求
  if (abortController.value) {
    abortController.value.abort()
  }
})
</script>

<style lang="less" scoped>
.chat-page {
  display: flex;
  height: 100%;
  background: #fff;
}

.material-area {
  width: 380px;
  border-left: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 16px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d9d9d9;
    border-radius: 3px;

    &:hover {
      background: #bfbfbf;
    }
  }
}

// 设置面板样式
.settings-panel {
  margin-top: 16px;

  .setting-item {
    margin-bottom: 24px;

    .setting-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #262626;
      margin-bottom: 8px;
    }

    .setting-hint {
      font-size: 12px;
      color: #8c8c8c;
      margin-top: 4px;
    }
  }
}

// 右侧聊天区域
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 24px 84px;

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 0 0 20px 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    // max-width: 900px;
    // margin: 0 auto;
    width: 100%;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: 3px;

      &:hover {
        background: transparent;
      }
    }
  }
}

@media (max-width: 768px) {
  .chat-page {
    flex-direction: column;
  }
}
</style>
