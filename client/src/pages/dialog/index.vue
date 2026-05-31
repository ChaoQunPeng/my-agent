<template>
  <div class="session-chat-page" :class="{ 'session-chat-page--with-material': hasMaterial }">
    <div class="session-chat-page__sidebar">
      <div class="session-chat-page__sidebar-header">
        <a-button type="primary" block :disabled="createSessionDisabled" @click="emit('create-session')">
          <PlusOutlined />
          新建对话
        </a-button>
      </div>

      <div class="session-chat-page__session-list">
        <SessionItem
          v-for="session in sessions"
          :key="session.sessionId"
          :session="session"
          :is-active="currentSessionId === session.sessionId"
          @click="emit('select-session', session.sessionId)"
          @action="handleSessionAction"
        />

        <a-empty v-if="sessions.length === 0" description="暂无会话" class="mt-48" />
      </div>
    </div>

    <div class="session-chat-page__chat">
      <ChatPanel ref="chatPanelRef" :session-id="sessionId" :api-func="apiFunc" :api-params="apiParams" />
    </div>

    <div v-if="hasMaterial" class="session-chat-page__material">
      <slot name="material" />
    </div>

    <a-modal v-model:open="editModalVisible" title="编辑会话" @ok="handleSaveSessionTitle" @cancel="editModalVisible = false">
      <a-form :model="editForm" layout="vertical">
        <a-form-item label="会话标题" required>
          <a-input v-model:value="editForm.title" placeholder="请输入会话标题" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
import { message as antMessage, Modal } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import ChatPanel from '@/components/chat/chat-panel.vue'
import SessionItem from '@/components/chat/session-item.vue'
import type { Session } from '@/api/session'

const props = withDefaults(
  defineProps<{
    sessions: Session[]
    currentSessionId: string
    sessionId?: string
    apiFunc: (params: any) => Promise<any>
    apiParams?: Record<string, unknown>
    createSessionDisabled?: boolean
  }>(),
  {
    sessionId: '',
    apiParams: () => ({}),
    createSessionDisabled: false
  }
)

const emit = defineEmits<{
  (e: 'create-session'): void
  (e: 'select-session', sessionId: string): void
  (e: 'delete-session', sessionId: string): void
  (e: 'save-session-title', payload: { sessionId: string; title: string }): void
}>()

const slots = useSlots()
const chatPanelRef = ref<InstanceType<typeof ChatPanel> | null>(null)
const editModalVisible = ref(false)
const editForm = ref({
  sessionId: '',
  title: ''
})

const hasMaterial = computed(() => Boolean(slots.material))

const handleSessionAction = (action: string, sessionId: string) => {
  if (action === 'edit') {
    const session = props.sessions.find(item => item.sessionId === sessionId)

    if (!session) return

    editForm.value = {
      sessionId: session.sessionId,
      title: session.title
    }
    editModalVisible.value = true
    return
  }

  if (action === 'delete') {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个会话吗？删除后无法恢复。',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        emit('delete-session', sessionId)
      }
    })
  }
}

const handleSaveSessionTitle = () => {
  const nextTitle = editForm.value.title.trim()

  if (!nextTitle) {
    antMessage.warning('请输入会话标题')
    return
  }

  emit('save-session-title', {
    sessionId: editForm.value.sessionId,
    title: nextTitle
  })
  editModalVisible.value = false
}

const stopGeneration = () => {
  chatPanelRef.value?.stopGeneration()
}

const clearMessages = () => {
  chatPanelRef.value?.clearMessages()
}

const getMessages = () => {
  chatPanelRef.value?.getMessages()
}

defineExpose({
  stopGeneration,
  clearMessages,
  getMessages
})
</script>

<style scoped lang="less">
.session-chat-page {
  display: flex;
  height: 100%;
  background: #fff;
}

.session-chat-page__sidebar {
  width: 240px;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.session-chat-page__sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.session-chat-page__session-list {
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

.session-chat-page__chat {
  flex: 1;
  min-width: 0;
  padding: 24px;
}

.session-chat-page__material {
  width: 380px;
  border-left: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: linear-gradient(180deg, #fcfcfd 0%, #f5f7fb 100%);

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

@media (max-width: 768px) {
  .session-chat-page {
    flex-direction: column;
  }

  .session-chat-page__sidebar {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid #f0f0f0;
  }

  .session-chat-page__chat {
    padding: 16px;
  }

  .session-chat-page__material {
    width: 100%;
    border-left: none;
    border-top: 1px solid #f0f0f0;
  }
}
</style>
