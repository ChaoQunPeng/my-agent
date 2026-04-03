<template>
  <div class="chat-input-wrap">
    <div class="chat-input-area">
      <a-textarea class="chat-input" v-model:value="inputMessage" placeholder="你好呀~" auto-size @pressEnter="handleSend" />
    </div>
    <div class="chat-actions">
      <div class="chat-action-buttons flex">
        <!-- <div class="mr-12">
          <RobotOutlined />
          深度思考
        </div>
        <div>
          <GlobalOutlined />
          联网搜索
        </div> -->
      </div>
      <div class="send-btn rounded-full flex items-center justify-center cursor-pointer">
        <ArrowUpOutlined :style="{ fontSize: '16px', color: '#fff' }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ArrowUpOutlined } from '@ant-design/icons-vue'

const inputMessage = ref('')

const emits = defineEmits<{
  send: [text: string]
}>()
const handleSend = (e: Event) => {
  e.preventDefault()
  emits('send', inputMessage.value)
  nextTick(() => {
    inputMessage.value = ''
  })
}
</script>

<style lang="less" scoped>
.chat-input-wrap {
  border: 1px solid rgba(5, 5, 5, 0.08);
  width: 800px;
  margin: 0 auto 30px auto;
  border-radius: 12px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.02),
    0 2px 2px rgba(72, 104, 178, 0.01),
    0 30px 60px rgba(72, 104, 178, 0.03);
}

.chat-input-area {
  padding: 12px 14px;
}

.chat-input {
  border: none;
  font-size: 16px;
  padding: 0;

  &:focus {
    border: none;
    box-shadow: none;
  }
}

.chat-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;

  .chat-action-buttons {
    > div {
      padding: 6px 12px;
      border: 1px solid rgba(5, 5, 5, 0.1);
      border-radius: 24px;
      cursor: pointer;
      font-weight: bold;

      &:hover {
        background: rgba(23, 119, 255, 0.05);
      }
    }
  }

  .send-btn {
    width: 34px;
    height: 34px;
    background: #1677ff;
    color: #fff;
  }
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  font-size: 12px;
  color: #1890ff;
  margin-right: 8px;
}

.info {
  display: flex;
}
</style>
