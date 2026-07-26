<template>
  <SessionChatWorkspace
    ref="workspaceRef"
    :sessions="sessions"
    :current-session-id="currentSessionId"
    :session-id="currentSessionId"
    :api-func="chatStreamApi"
    :ensure-session="handleEnsureSession"
    @create-session="handleCreate"
    @select-session="handleSelect"
    @delete-session="handleDeleteSession"
    @save-session-title="handleUpdateSession"
  >
    <template #material>
      <NovelOperationPanel />
    </template>
  </SessionChatWorkspace>
</template>

<script setup lang="ts">
import { chatStreamApi } from '@/composables/chat-stream'
import SessionChatWorkspace from '@/pages/dialog/index.vue'
import { useSessionManager } from '@/pages/dialog/composables/use-session-manager'
import NovelOperationPanel from './components/novel-operation-panel.vue'

const MODULE_KEY = 'inspiration-chat'

const workspaceRef = ref<InstanceType<typeof SessionChatWorkspace> | null>(null)

const {
  sessions,
  currentSessionId,
  fetchSessions,
  handleCreateSession,
  handleDeleteSession,
  handleSelectSession,
  handleUpdateSession
} = useSessionManager({
  getModuleKey: () => MODULE_KEY,
  onSessionSelected: () => workspaceRef.value?.getMessages(),
  onCurrentSessionCleared: () => workspaceRef.value?.clearMessages()
})

const handleCreate = async () => {
  workspaceRef.value?.stopGeneration()
  await handleCreateSession()
}

const handleSelect = async (sessionId: string) => {
  workspaceRef.value?.stopGeneration()
  await handleSelectSession(sessionId)
}

const handleEnsureSession = async () => {
  // 模块没有当前会话时，在发送前自动创建。
  if (!currentSessionId.value) {
    await handleCreateSession()
  }

  return currentSessionId.value || undefined
}

onMounted(async () => {
  await fetchSessions()
  if (sessions.value[0]) {
    await handleSelectSession(sessions.value[0].sessionId)
  }
})
</script>
