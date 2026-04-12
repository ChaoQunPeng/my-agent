<template>
  <div class="chat-page">
    <div class="chat-container">
      <ChatPanel ref="chatPanelRef" :api-func="chatStreamNoRecordApi" :api-params="{ temperature, systemPrompt }" />
      <!-- <div class="chat-messages" ref="messagesContainer">
        <MessageList ref="messageListRef" :messages="messages" @copy="copyMessage" @regenerate="regenerateMessage" />
      </div>

      <div>
        <input-area @send="handleNoRecordChat" :sending="sending" @stop="stopGeneration"></input-area>
      </div> -->
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
import { ref } from 'vue'
import { DeleteOutlined } from '@ant-design/icons-vue'
import ChatPanel from '~@/components/chat/chat-panel.vue'
import { message as antMessage, Modal } from 'ant-design-vue'
import { chatStreamNoRecordApi } from '@/composables/chat-stream'
import { clearTempMessages } from '@/api/session'

// Temperature 设置 (0-2)
const temperature = ref<number>(0.7)
// System Prompt 设置
const systemPrompt = ref<string>('')

const chatPanelRef = ref<InstanceType<typeof ChatPanel>>()

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
        chatPanelRef.value?.clearMessages()

        antMessage.success('已清空所有消息')
      } catch (error) {
        console.error('清空消息失败:', error)
        antMessage.error(error instanceof Error ? error.message : '清空消息失败')
      }
    }
  })
}
</script>

<style lang="less" scoped>
.chat-page {
  display: flex;
  height: 100%;
  background: #fff;
}

// 右侧聊天区域
.chat-container {
  padding: 24px 84px;
  overflow-y: auto;
  height: 100%;
  flex: 1;
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
</style>
