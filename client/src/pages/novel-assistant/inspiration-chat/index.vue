<template>
  <SessionChatWorkspace ref="workspaceRef" :sessions="visibleSessions" :current-session-id="currentSessionId"
    :session-id="currentSessionId" :api-func="chatStreamApi" :ensure-session="handleEnsureSession"
    :api-params="chatApiParams" :create-session-disabled="!selectedNovelId" @create-session="handleCreate"
    @select-session="handleSelect" @delete-session="handleDeleteSession" @save-session-title="handleUpdateSession">
    <template #material>
      <NovelOperationPanel />
    </template>
  </SessionChatWorkspace>
</template>

<script setup lang="ts">
import { chatStreamApi } from '@/composables/chat-stream'
import SessionChatWorkspace from '@/pages/dialog/index.vue'
import { useSessionManager } from '@/pages/dialog/composables/use-session-manager'
import { useNovelAssistantStore } from '@/stores/novel-assistant'
import { message as antMessage } from 'ant-design-vue'
import NovelOperationPanel from './components/novel-operation-panel.vue'

const MODULE_KEY = 'inspiration-chat'

const store = useNovelAssistantStore()
const { selectedNovelId } = storeToRefs(store)
const workspaceRef = ref<InstanceType<typeof SessionChatWorkspace> | null>(null)
let sessionLoadVersion = 0

// 将当前小说作为灵感对话的提示词资源传给后端。
const chatApiParams = computed(() => ({
  type: MODULE_KEY,
  resourceId: selectedNovelId.value
}))

const {
  sessions,
  currentSessionId,
  clearCurrentSession,
  fetchSessions,
  handleCreateSession,
  handleDeleteSession,
  handleSelectSession,
  handleUpdateSession
} = useSessionManager({
  getModuleKey: () => MODULE_KEY,
  canCreateSession: () => Boolean(selectedNovelId.value),
  shouldFetchSessions: () => Boolean(selectedNovelId.value),
  getCreateBlockedMessage: () => '请先选择小说',
  onSessionSelected: () => workspaceRef.value?.getMessages(),
  onCurrentSessionCleared: () => workspaceRef.value?.clearMessages()
})
const visibleSessions = computed(() => (selectedNovelId.value ? sessions.value : []))

const handleCreate = async () => {
  workspaceRef.value?.stopGeneration()
  await handleCreateSession()
}

const handleSelect = async (sessionId: string) => {
  workspaceRef.value?.stopGeneration()
  await handleSelectSession(sessionId)
}

const handleEnsureSession = async () => {
  if (!selectedNovelId.value) {
    antMessage.warning('请先选择小说')
    return
  }

  // 选择小说后没有当前会话时，在发送前自动创建。
  if (!currentSessionId.value) {
    await handleCreateSession()
  }

  return currentSessionId.value || undefined
}

watch(selectedNovelId, async (novelId) => {
  const loadVersion = ++sessionLoadVersion

  // 小说为空或发生切换时，立即清理上一轮会话数据。
  workspaceRef.value?.stopGeneration()
  clearCurrentSession()
  sessions.value = []

  if (!novelId) return

  await fetchSessions()
  if (loadVersion !== sessionLoadVersion || selectedNovelId.value !== novelId) return

  if (sessions.value[0]) {
    await handleSelectSession(sessions.value[0].sessionId)
  }
}, { immediate: true })
</script>
