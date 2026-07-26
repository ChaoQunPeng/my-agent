<template>
  <SessionChatWorkspace
    :key="selectedNovelId || 'novel-unselected'"
    ref="workspaceRef"
    :sessions="sessions"
    :current-session-id="currentSessionId"
    :session-id="currentSessionId"
    :api-func="chatStreamApi"
    :api-params="chatApiParams"
    :ensure-session="handleEnsureSession"
    :create-session-disabled="!selectedNovelId"
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
import { createSession, getSessions } from '@/api/session'
import { chatStreamApi } from '@/composables/chat-stream'
import SessionChatWorkspace from '@/pages/dialog/index.vue'
import { useSessionManager } from '@/pages/dialog/composables/use-session-manager'
import { useNovelAssistantStore } from '@/stores/novel-assistant'
import { message as antMessage } from 'ant-design-vue'
import NovelOperationPanel from './components/novel-operation-panel.vue'

const SESSION_TYPE = 'novel'

const store = useNovelAssistantStore()
const { selectedNovelId } = storeToRefs(store)
const workspaceRef = ref<InstanceType<typeof SessionChatWorkspace> | null>(null)
let sessionLoadVersion = 0
let sessionInitializationPromise: Promise<void> | undefined

const chatApiParams = computed(() => ({
  type: SESSION_TYPE,
  resourceId: selectedNovelId.value
}))

const {
  sessions,
  currentSessionId,
  clearCurrentSession,
  handleCreateSession,
  handleDeleteSession,
  handleSelectSession,
  handleUpdateSession
} = useSessionManager({
  getSessionType: () => SESSION_TYPE,
  getResourceId: () => selectedNovelId.value || undefined,
  canCreateSession: () => Boolean(selectedNovelId.value),
  shouldFetchSessions: () => Boolean(selectedNovelId.value),
  getCreateBlockedMessage: () => '请先选择小说',
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
  // 发送前必须先选择小说；有小说但无会话时自动创建。
  const novelId = selectedNovelId.value
  if (!novelId) {
    antMessage.warning('请先选择小说')
    return
  }

  // 等待当前小说的会话初始化，避免发送流程重复创建会话。
  let pendingInitialization = sessionInitializationPromise
  while (pendingInitialization) {
    await pendingInitialization
    if (pendingInitialization === sessionInitializationPromise) break
    pendingInitialization = sessionInitializationPromise
  }

  if (selectedNovelId.value !== novelId) return

  if (!currentSessionId.value) {
    try {
      const createRes = await createSession({
        type: SESSION_TYPE,
        resourceId: novelId
      })
      if (selectedNovelId.value !== novelId) return

      const newSession = createRes.data
      if (!newSession) throw new Error('会话创建失败')

      sessions.value.unshift(newSession)
      await handleSelectSession(newSession.sessionId)
    } catch (error) {
      if (selectedNovelId.value === novelId) {
        antMessage.error('创建会话失败')
      }
      return
    }
  }

  if (selectedNovelId.value !== novelId) return
  return currentSessionId.value || undefined
}

const ensureNovelSession = async (novelId: string) => {
  const loadVersion = ++sessionLoadVersion

  // 切换小说时立即清理旧会话，避免旧请求结果覆盖当前小说。
  workspaceRef.value?.stopGeneration()
  clearCurrentSession()
  sessions.value = []

  if (!novelId) return

  try {
    const sessionRes = await getSessions(SESSION_TYPE, novelId)
    if (loadVersion !== sessionLoadVersion || selectedNovelId.value !== novelId) return

    sessions.value = sessionRes.data || []
    if (sessions.value[0]) {
      await handleSelectSession(sessions.value[0].sessionId)
      return
    }

    const createRes = await createSession({
      type: SESSION_TYPE,
      resourceId: novelId
    })
    if (loadVersion !== sessionLoadVersion || selectedNovelId.value !== novelId) return

    const newSession = createRes.data
    if (!newSession) throw new Error('会话创建失败')

    sessions.value = [newSession]
    await handleSelectSession(newSession.sessionId)
  } catch (error) {
    if (loadVersion === sessionLoadVersion) {
      antMessage.error('会话初始化失败')
    }
  }
}

watch(
  selectedNovelId,
  (novelId) => {
    // 每部小说维护独立会话，并保证选中小说后始终有当前会话。
    sessionInitializationPromise = ensureNovelSession(novelId)
  },
  { immediate: true }
)
</script>
