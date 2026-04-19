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
      <ChatPanel
        ref="chatPanelRef"
        :session-id="currentSessionId"
        :api-func="chatStreamApi"
        :api-params="{
          type: currentSessionType,
          resourceId: currentCharacterId
        }"
      />
    </div>

    <!-- 素材区域 -->
    <div class="material-area">
      <!-- 人物选择组件（仅在type为character时显示） -->
      <CharacterSelector
        v-if="currentSessionType == 'character' && currentSessionId"
        :session-id="currentSessionId"
        v-model="selectedCharacterId"
        @character-bound="handleCharacterBound"
      />

      <!-- 写作助手（仅在type为novel时显示） -->
      <WritingAssistant v-if="currentSessionType == 'novel' && currentSessionId" :session-id="currentSessionId" />
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
import ChatPanel from '~@/components/chat/chat-panel.vue'
import SessionItem from '@/components/chat/session-item.vue'
import MessageList from '@/components/chat/message-list.vue'
import WritingAssistant from './components/writing-assistant.vue'
import CharacterSelector from './components/character-selector.vue'
import { chatStreamApi } from '../../composables/chat-stream'
import { getSessions, createSession, updateSession, deleteSession, type Session } from '@/api/session'
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
const chatPanelRef = ref<InstanceType<typeof ChatPanel> | null>(null)

// 获取当前路由信息
const route = useRoute()

const currentSessionType = computed(() => {
  return route.meta?.sessionType as string
})

// 当前会话绑定的角色ID（用于聊天API调用）
const currentCharacterId = ref<string>('')

// 选中的角色ID（用于人物选择器双向绑定）
const selectedCharacterId = ref<string>('')

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

onMounted(() => {
  fetchSessions()
})

onUnmounted(() => {
  // 清理未完成的请求
  if (abortController.value) {
    abortController.value.abort()
  }
})

// 获取会话列表
const fetchSessions = async () => {
  try {
    // 根据新的schema，使用category、type、resourceId作为筛选条件
    const res = await getSessions(currentSessionType.value)
    sessions.value = res.data || []
  } catch (error: any) {
    antMessage.error('获取会话列表失败')
  }
}

// 创建新会话
const handleCreateSession = async () => {
  try {
    // 根据新的schema，使用type和resourceId代替novelCode
    const res = await createSession({
      type: currentSessionType.value
    })
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
  // if (currentSessionId.value === sessionId) return

  // 如果正在发送，先停止
  if (sending.value && abortController.value) {
    chatPanelRef.value?.stopGeneration()
  }

  currentSessionId.value = sessionId
  await nextTick()
  chatPanelRef.value?.getMessages()
  // 如果会话类型为character，获取绑定的角色ID
  if (currentSessionType.value === 'character') {
    await fetchCurrentCharacterId(sessionId)
  }

  messageListRef.value?.scrollToBottom()
}

/**
 * 获取当前会话绑定的角色ID
 */
const fetchCurrentCharacterId = async (sessionId: string) => {
  try {
    const res = await getCharacterBySessionId(sessionId)
    if (res.data) {
      // 这里保留characterId用于聊天API调用
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

// 监听路由变化，当sessionCategory、resourceType或resourceId改变时重新获取会话列表
watch(
  () => [route.meta?.sessionCategory, route.meta?.resourceType, route.meta?.resourceId],
  () => {
    // 清空当前选中的会话和消息
    currentSessionId.value = ''
    // 重新获取会话列表
    fetchSessions()
  }
)
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

// 不保存记录的对话按钮样式
.no-record-chat-btn {
  padding: 12px 0;
  text-align: center;
  border-top: 1px solid #f0f0f0;
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
