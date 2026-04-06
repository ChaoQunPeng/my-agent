<template>
  <div class="chat-page">
    <!-- 左侧会话列表 -->
    <div class="session-sidebar">
      <div class="sidebar-header">
        <a-button type="primary" block @click="handleCreateSession"> <PlusOutlined /> 新建对话 </a-button>
      </div>

      <div class="session-list">
        <SessionItem
          v-for="session in sessions"
          :key="session.sessionId"
          :session="session"
          :is-active="currentSessionId === session.sessionId"
          @click="handleSelectSession"
          @action="handleSessionAction"
        />

        <a-empty v-if="sessions.length === 0" description="暂无会话" class="mt-48" />
      </div>
    </div>

    <!-- 右侧聊天区域 -->
    <div class="chat-container">
      <!-- Loading 遮罩 -->
      <div v-if="loading" class="loading-overlay">
        <a-spin size="large" tip="加载中..." />
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <MessageList ref="messageListRef" :messages="messages" @copy="copyMessage" @regenerate="regenerateMessage" />
      </div>

      <input-area @send="handleSend" :sending="sending" @stop="stopGeneration"></input-area>
    </div>

    <!-- 素材区域 -->
    <div class="material-area">
      <!-- 人物选择组件 -->
      <CharacterSelector
        v-if="sessionCategory == 'digital' && currentSessionId"
        :session-id="currentSessionId"
        @character-bound="handleCharacterBound"
      />

      <!-- 写作助手（仅在writing分类下显示） -->
      <WritingAssistant
        v-if="sessionCategory == 'writing' && currentSessionId"
        :session-id="currentSessionId"
        :session-category="sessionCategory"
        :novel-code="currentNovelCode"
      />
    </div>

    <!-- 编辑会话对话框 -->
    <a-modal v-model:open="editModalVisible" title="编辑会话" @ok="handleUpdateSession" @cancel="editModalVisible = false">
      <a-form :model="editForm" layout="vertical">
        <a-form-item label="会话标题" required>
          <a-input v-model:value="editForm.title" placeholder="请输入会话标题" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { message as antMessage, Modal } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import InputArea from './components/input-area.vue'
import SessionItem from './components/session-item.vue'
import MessageList from './components/message-list.vue'
import WritingAssistant from './components/writing-assistant.vue'
import CharacterSelector from './components/character-selector.vue'
import { chatStreamApi } from '../../composables/chat-stream'
import {
  getSessions,
  createSession,
  getSessionDetail,
  updateSession,
  deleteSession,
  addMessage,
  type Session,
  type Message
} from '@/api/session'
// 导入获取会话绑定角色的 API
import { getCharacterBySessionId } from '@/api/character'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  loadingText?: string
}

// 会话相关
const sessions = ref<Session[]>([])
const currentSessionId = ref<string>('')
const loading = ref(false)

// 获取当前路由信息
const route = useRoute()

// 从路由meta中获取sessionCategory
const sessionCategory = computed(() => (route.meta?.sessionCategory as string) || '')

// 从路由meta中获取novelCode
const routeNovelCode = computed(() => (route.meta?.novelCode as string) || '')

// 获取当前会话的 novelCode（优先使用路由中的值）
const currentNovelCode = computed(() => {
  // 如果路由中有 novelCode，优先使用
  if (routeNovelCode.value) {
    return routeNovelCode.value
  }
  // 否则从会话列表中获取
  const currentSession = sessions.value.find(s => s.sessionId === currentSessionId.value)
  return currentSession?.novelCode || ''
})

// 当前会话绑定的角色ID
const currentCharacterId = ref<string>('')

// 消息相关
const messages = ref<ChatMessage[]>([])
const sending = ref(false)
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)
const abortController = ref<AbortController | null>(null)

// 编辑会话
const editModalVisible = ref(false)
const editForm = ref({
  sessionId: '',
  title: ''
})

// 获取会话列表
const fetchSessions = async () => {
  try {
    const res = await getSessions(sessionCategory.value, currentNovelCode.value)
    sessions.value = res.data || []
  } catch (error: any) {
    antMessage.error('获取会话列表失败')
  }
}

// 创建新会话
const handleCreateSession = async () => {
  try {
    const res = await createSession({ category: sessionCategory.value, novelCode: currentNovelCode.value })
    const newSession = res.data

    // 添加到列表顶部
    sessions.value.unshift(newSession)

    // 自动切换到新会话
    await handleSelectSession(newSession.sessionId)

    antMessage.success('会话创建成功')
  } catch (error: any) {
    antMessage.error('创建会话失败')
  }
}

// 选择会话
const handleSelectSession = async (sessionId: string) => {
  if (currentSessionId.value === sessionId) return

  // 如果正在发送，先停止
  if (sending.value && abortController.value) {
    abortController.value.abort()
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  currentSessionId.value = sessionId
  loading.value = true
  try {
    const res = await getSessionDetail(sessionId)
    const { messages: messageList } = res.data

    // 转换消息格式
    messages.value = messageList.map((msg: Message) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      loading: false
    }))

    // 获取当前会话绑定的角色ID
    await fetchCurrentCharacterId(sessionId)

    await nextTick()
    messageListRef.value?.scrollToBottom()
  } catch (error: any) {
    antMessage.error('获取会话详情失败')
  } finally {
    loading.value = false
  }
}

/**
 * 获取当前会话绑定的角色ID
 */
const fetchCurrentCharacterId = async (sessionId: string) => {
  try {
    const res = await getCharacterBySessionId(sessionId)
    if (res.data) {
      currentCharacterId.value = res.data.characterId
    } else {
      currentCharacterId.value = ''
    }
  } catch (error) {
    console.error('获取会话绑定角色失败', error)
    currentCharacterId.value = ''
  }
}

/**
 * 处理角色绑定事件
 */
const handleCharacterBound = (characterId: string) => {
  currentCharacterId.value = characterId
  antMessage.success('角色绑定成功，后续对话将使用该角色')
}

// 会话操作（编辑、删除）
const handleSessionAction = (action: string, sessionId: string) => {
  if (action === 'edit') {
    const session = sessions.value.find(s => s.sessionId === sessionId)
    if (session) {
      editForm.value = {
        sessionId: session.sessionId,
        title: session.title
      }
      editModalVisible.value = true
    }
  } else if (action === 'delete') {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个会话吗？删除后无法恢复。',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        await handleDeleteSession(sessionId)
      }
    })
  }
}

// 删除会话
const handleDeleteSession = async (sessionId: string) => {
  try {
    await deleteSession(sessionId)

    // 从列表中移除
    const index = sessions.value.findIndex(s => s.sessionId === sessionId)
    if (index > -1) {
      sessions.value.splice(index, 1)
    }

    // 如果删除的是当前会话，清空消息
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = ''
      messages.value = []
    }

    antMessage.success('会话删除成功')
  } catch (error: any) {
    antMessage.error('删除会话失败')
  }
}

// 更新会话
const handleUpdateSession = async () => {
  if (!editForm.value.title.trim()) {
    antMessage.warning('请输入会话标题')
    return
  }

  try {
    await updateSession(editForm.value.sessionId, {
      title: editForm.value.title
    })

    // 更新本地列表
    const session = sessions.value.find(s => s.sessionId === editForm.value.sessionId)
    if (session) {
      session.title = editForm.value.title
    }

    editModalVisible.value = false
    antMessage.success('更新成功')
  } catch (error: any) {
    antMessage.error('更新失败')
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
  if (sending.value || !currentSessionId.value) return

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
  if (!text.trim() || !currentSessionId.value) {
    if (!currentSessionId.value) {
      antMessage.warning('请先选择或创建一个会话')
    }
    return
  }

  // 如果正在发送,先停止当前请求
  if (sending.value && abortController.value) {
    abortController.value.abort()
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  sending.value = true
  abortController.value = new AbortController()

  // 如果不是重新生成,添加用户消息
  if (!isRegenerate) {
    messages.value.push({ role: 'user', content: text })

    // 保存到后端
    try {
      await addMessage(currentSessionId.value, 'user', text)
    } catch (error) {
      console.error('保存用户消息失败', error)
    }
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
  messageListRef.value?.scrollToBottom()

  let fullReply = ''

  try {
    await chatStreamApi({
      message: text,
      sessionId: currentSessionId.value,
      scene: sessionCategory.value,
      characterId: currentCharacterId.value,
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

// 停止生成
const stopGeneration = () => {
  if (abortController.value) {
    abortController.value.abort()
  }
}

onMounted(() => {
  fetchSessions()
})

// 监听路由变化，当sessionCategory或novelCode改变时重新获取会话列表
watch(
  () => [route.meta?.sessionCategory, route.meta?.novelCode],
  () => {
    // 清空当前选中的会话和消息
    currentSessionId.value = ''
    messages.value = []
    // 重新获取会话列表
    fetchSessions()
  }
)

onUnmounted(() => {
  // 清理未完成的请求
  if (abortController.value) {
    abortController.value.abort()
  }
})

defineExpose({
  stopGeneration
})
</script>

<style lang="less" scoped>
.chat-page {
  display: flex;
  height: 100%;
  background: #fff;
}

// 左侧会话列表
.session-sidebar {
  width: 240px;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  // background: #fafafa;

  .sidebar-header {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  .session-list {
    flex: 1;
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

  .session-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    margin-bottom: 4px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background: #e6f7ff;

      .session-actions {
        opacity: 1;
      }
    }

    &.active {
      background: #e6f7ff;
    }

    .session-info {
      flex: 1;
      min-width: 0;

      .session-title {
        font-size: 14px;
        font-weight: 500;
        color: #262626;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .session-time {
        font-size: 12px;
        color: #8c8c8c;
      }
    }

    .session-actions {
      opacity: 0;
      transition: opacity 0.2s;
      margin-left: 8px;
    }

    &:last-child {
      border-bottom: none;
    }
  }
}

.material-area {
  width: 380px;
  border-left: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

// 右侧聊天区域
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 24px;

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 0 0 20px 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 900px;
    margin: 0 auto;
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

  .session-sidebar {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid #f0f0f0;
  }
}
</style>
