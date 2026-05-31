<template>
  <SessionChatWorkspace
    ref="workspaceRef"
    :sessions="sessions"
    :current-session-id="currentSessionId"
    :session-id="currentSessionId"
    :api-func="chatStreamApi"
    :api-params="chatApiParams"
    :create-session-disabled="createSessionDisabled"
    @create-session="handleCreate"
    @select-session="handleSelect"
    @delete-session="handleDeleteSession"
    @save-session-title="handleUpdateSession"
  >
    <template #material>
      <div class="novel-material-panel">
        <div class="novel-selector-card">
          <div class="novel-selector-card__title">小说对话</div>
          <div class="novel-selector-card__subtitle">选择 `novelCode`，切换当前小说的会话和百科问答上下文。</div>

          <div class="novel-selector-card__row">
            <a-select
              v-model:value="novelCodeDraft"
              show-search
              :options="novelCodeOptions"
              option-filter-prop="value"
              placeholder="选择 novelCode"
              class="novel-selector-card__input"
              @change="handleNovelCodeSelect"
            />
          </div>

          <div class="novel-selector-card__current">当前小说：{{ currentNovelCode || '未选择' }}</div>
        </div>

        <!-- <WritingAssistant v-if="currentSessionId && currentNovelCode" :session-id="currentSessionId" :novel-code="currentNovelCode" /> -->
      </div>
    </template>
  </SessionChatWorkspace>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message as antMessage } from 'ant-design-vue'
import SessionChatWorkspace from '@/pages/dialog/index.vue'
import { chatStreamApi } from '@/composables/chat-stream'
import { listOutlineJobs } from '@/api/novel-outline'
import { useSessionManager } from '@/pages/dialog/composables/use-session-manager'

const SESSION_TYPE = 'novel'

const route = useRoute()
const workspaceRef = ref<InstanceType<typeof SessionChatWorkspace> | null>(null)
const currentNovelCode = ref('')
const novelCodeDraft = ref('')
const novelCodeOptions = ref<Array<{ value: string }>>([])

const createSessionDisabled = computed(() => !currentNovelCode.value.trim())
const chatApiParams = computed(() => ({
  type: SESSION_TYPE,
  resourceId: currentNovelCode.value.trim()
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
  getSessionType: () => SESSION_TYPE,
  getResourceId: () => currentNovelCode.value.trim() || undefined,
  canCreateSession: () => !createSessionDisabled.value,
  shouldFetchSessions: () => Boolean(currentNovelCode.value.trim()),
  getCreateBlockedMessage: () => '请先选择 novelCode',
  onSessionSelected: () => {
    workspaceRef.value?.getMessages()
  },
  onCurrentSessionCleared: () => {
    workspaceRef.value?.clearMessages()
  }
})

const syncNovelCodeOption = (code: string) => {
  const nextCode = code.trim()

  if (!nextCode || novelCodeOptions.value.some(option => option.value === nextCode)) {
    return
  }

  novelCodeOptions.value = [...novelCodeOptions.value, { value: nextCode }].sort((a, b) => a.value.localeCompare(b.value))
}

const syncNovelCodeFromRoute = () => {
  const nextCode = String(route.meta?.resourceId || route.meta?.novelCode || '').trim()

  currentNovelCode.value = nextCode
  novelCodeDraft.value = nextCode
  syncNovelCodeOption(nextCode)
}

const loadNovelCodeOptions = async () => {
  try {
    const res = await listOutlineJobs()
    const codes = Array.from(
      new Set([
        ...(res.data || []).map(job => job.novelCode).filter(Boolean),
        currentNovelCode.value.trim()
      ].filter(Boolean))
    ).sort((a, b) => a.localeCompare(b))

    novelCodeOptions.value = codes.map(code => ({
      value: code
    }))
  } catch (error) {
    console.error('加载 novelCode 列表失败', error)
  }
}

const handleNovelCodeSubmit = async (selectedValue?: string) => {
  const nextCode = (selectedValue || novelCodeDraft.value).trim()
  novelCodeDraft.value = nextCode

  if (!nextCode) {
    currentNovelCode.value = ''
    clearCurrentSession()
    sessions.value = []
    antMessage.warning('请先选择 novelCode')
    return
  }

  if (nextCode === currentNovelCode.value.trim()) {
    await fetchSessions()
    return
  }

  workspaceRef.value?.stopGeneration()
  currentNovelCode.value = nextCode
  syncNovelCodeOption(nextCode)
  clearCurrentSession()
  await fetchSessions()
  antMessage.success(`已切换到小说 ${nextCode}`)
}

const handleNovelCodeSelect = (value: unknown) => {
  if (typeof value === 'string' || typeof value === 'number') {
    void handleNovelCodeSubmit(String(value))
    return
  }

  if (value && typeof value === 'object' && 'value' in value) {
    const nextValue = value.value
    void handleNovelCodeSubmit(nextValue == null ? '' : String(nextValue))
    return
  }

  void handleNovelCodeSubmit('')
}

const handleCreate = async () => {
  workspaceRef.value?.stopGeneration()
  await handleCreateSession()
}

const handleSelect = async (sessionId: string) => {
  workspaceRef.value?.stopGeneration()
  await handleSelectSession(sessionId)
}

watch(
  () => [route.meta?.resourceId, route.meta?.novelCode],
  async () => {
    syncNovelCodeFromRoute()
    clearCurrentSession()
    await fetchSessions()
  }
)

onMounted(async () => {
  syncNovelCodeFromRoute()
  await Promise.all([fetchSessions(), loadNovelCodeOptions()])
})
</script>

<style scoped lang="less">
.novel-material-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.novel-selector-card {
  padding: 16px;
  background: #fff;
  height: 100%;
}

.novel-selector-card__title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.novel-selector-card__subtitle {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #6b7280;
}

.novel-selector-card__row {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.novel-selector-card__input {
  flex: 1;
}

.novel-selector-card__current {
  margin-top: 12px;
  font-size: 12px;
  color: #4b5563;
}
</style>
