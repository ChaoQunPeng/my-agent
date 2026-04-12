<template>
  <div class="chat-panel">
    <div class="chat-messages" ref="messagesContainer">
      <MessageList ref="messageListRef" :messages="messages" @copy="copyMessage" @regenerate="regenerateMessage" />
    </div>

    <div>
      <!-- 增加清空对话 -->
      <input-area @send="handleSend" :sending="sending" @stop="stopGeneration"></input-area>
    </div>
  </div>
</template>

<script setup lang="ts">
import InputArea from '@/components/chat/input-area.vue'
import MessageList from '@/components/chat/message-list.vue'
import { message as antMessage } from 'ant-design-vue'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  loadingText?: string
}

// 定义组件属性,使用 withDefaults 设置默认值
const props = withDefaults(
  defineProps<{
    apiFunc: (params: any) => Promise<any>
    apiParams?: object // 将 apiParams 设为可选参数
  }>(),
  {
    // 设置 apiParams 的默认值为空对象,使用箭头函数确保每次创建新的对象实例
    apiParams: () => ({})
  }
)

// 消息相关
const messages = ref<ChatMessage[]>([])
const sending = ref(false)
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)
const abortController = ref<AbortController | null>(null)

onUnmounted(() => {
  // 清理未完成的请求
  if (abortController.value) {
    abortController.value.abort()
  }
})

/**
 * 不保存记录的对话（临时对话）
 * 此功能不会将消息保存到数据库，适合临时性对话和测试
 */
const handleSend = async (text: string) => {
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
    await props.apiFunc({
      message: text,
      ...props.apiParams,
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
  await handleSend(userMessage)
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

// 清空对话
const clearMessages = () => {
  messages.value = []
}

defineExpose({
  clearMessages
})
</script>

<style scoped lang="less">
// 右侧聊天区域
.chat-panel {
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;

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
</style>
