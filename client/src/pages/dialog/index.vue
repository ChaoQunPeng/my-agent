<template>
  <div class="chat-container">
    <!-- <div class="chat-header">
        <h2>智能对话</h2>
        <div class="chat-controls">
          <a-button
            @click="toggleWebSearch"
            :type="webSearchEnabled ? 'primary' : 'default'"
            size="small"
          >
            {{ webSearchEnabled ? '联网搜索: 开启' : '联网搜索: 关闭' }}
          </a-button>
          <a-button
            @click="toggleDeepThinking"
            :type="deepThinkingMode ? 'primary' : 'default'"
            size="small"
          >
            {{ deepThinkingMode ? '深度思考: 开启' : '深度思考: 关闭' }}
          </a-button>
          <a-button @click="clearMessages" danger size="small">清空对话</a-button>
        </div>
      </div> -->

    <div class="chat-messages" ref="messagesContainer">
      <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
        <!-- <div class="avatar">
          <user-avatar v-if="message.role === 'user'" />
          <a-avatar
            v-else
            :size="32"
            :style="{ backgroundColor: message.type === 'thinking' ? '#9254de' : '#4a90e2' }"
          >
            <template #icon>
              <span>{{ message.type === 'thinking' ? '思考' : 'AI' }}</span>
            </template>
          </a-avatar>
        </div> -->
        <div class="content">
          <div class="text">
            <div v-if="message.thinking" class="thinking-indicator">
              <a-spin size="small" />
              <span>深度思考中...</span>
            </div>
            <div v-else-if="message.searching" class="searching-indicator">
              <a-spin size="small" />
              <span>正在联网搜索...</span>
            </div>
            <div
              v-else-if="message.content"
              class="message-content"
              :class="{ 'deep-thinking-content': message.type === 'thinking' }"
            >
              <div v-if="message.type === 'thinking'">
                <div class="deep-thinking-header">
                  <span class="tag">深度思考过程</span>
                </div>
                <div v-html="formatMessage(message.content)"></div>
              </div>
              <div v-else v-html="formatMessage(message.content)"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 流式消息显示 -->
      <div v-if="streamingMessage" class="message assistant streaming">
        <!-- <div class="avatar">
          <a-avatar
            :size="32"
            :style="{
              backgroundColor: streamingMessageType === 'thinking' ? '#9254de' : '#4a90e2'
            }"
          >
            <template #icon>
              <span>{{ streamingMessageType === 'thinking' ? '思考' : 'AI' }}</span>
            </template>
          </a-avatar>
        </div> -->
        <div class="content">
          <div class="text">
            <div
              class="message-content"
              :class="{ 'deep-thinking-streaming': streamingMessageType === 'thinking' }"
            >
              {{ streamingMessage }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <input-area @send="handleSend"></input-area>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { message as antMessage } from 'ant-design-vue';
// import UserAvatar from '@/components/user-avatar/index.vue';
import InputArea from './components/input-area.vue';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: boolean;
  searching?: boolean;
  type?: 'dialog' | 'thinking'; // 区分是对话还是深度思考
}

const messages = ref<ChatMessage[]>([
  // {
  //   role: 'assistant',
  //   content:
  //     '您好！我是您的智能助手，我可以帮您解答各种问题。您可以开启"深度思考"模式获得更深入的分析，或者开启"联网搜索"获取最新的信息。请问有什么我可以帮助您的吗？',
  //   type: 'dialog'
  // }
]);

const inputMessage = ref('');
const sending = ref(false);
const webSearchEnabled = ref(false);
const deepThinkingMode = ref(false);
const messagesContainer = ref<HTMLDivElement | null>(null);
const streamingMessage = ref('');
const streamingMessageType = ref<'dialog' | 'thinking'>('dialog');

// 切换联网搜索
const toggleWebSearch = () => {
  webSearchEnabled.value = !webSearchEnabled.value;
  antMessage.info(`联网搜索已${webSearchEnabled.value ? '开启' : '关闭'}`);
};

// 切换深度思考模式
const toggleDeepThinking = () => {
  deepThinkingMode.value = !deepThinkingMode.value;
  antMessage.info(`深度思考模式已${deepThinkingMode.value ? '开启' : '关闭'}`);
};

// 清空对话
const clearMessages = () => {
  messages.value = [
    {
      role: 'assistant',
      content:
        '对话已清空。您好！我是您的智能助手，我可以帮您解答各种问题。您可以开启"深度思考"模式获得更深入的分析，或者开启"联网搜索"获取最新的信息。请问有什么我可以帮助您的吗？',
      type: 'dialog'
    }
  ];
};

// 格式化消息显示
const formatMessage = (content: string) => {
  // 简单的换行处理
  return content.replace(/\n/g, '<br>');
};

// 发送消息
const handleSend = async (text: string) => {
  if (!text.trim() || sending.value) return;

  const userMessage: ChatMessage = {
    role: 'user',
    content: text.trim()
  };

  messages.value.push(userMessage);
  const userQuery = text.trim();

  await nextTick();
  scrollToBottom();

  sending.value = true;
  streamingMessage.value = '';
  streamingMessageType.value = 'dialog';

  try {
    // 模拟深度思考过程
    if (deepThinkingMode.value) {
      messages.value.push({
        role: 'assistant',
        content: '',
        thinking: true
      });

      await nextTick();
      scrollToBottom();

      // 模拟思考时间
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 移除思考标记
      messages.value = messages.value.filter(msg => !msg.thinking);

      // 模拟深度思考过程流式输出
      await simulateDeepThinkingProcess(userQuery);
    }

    // 模拟联网搜索过程
    if (webSearchEnabled.value) {
      messages.value.push({
        role: 'assistant',
        content: '',
        searching: true
      });

      await nextTick();
      scrollToBottom();

      // 模拟搜索时间
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 移除搜索标记
      messages.value = messages.value.filter(msg => !msg.searching);
    }

    // 模拟SSE流式消息接收
    await simulateStreamResponse(userQuery);
  } catch (error) {
    console.error('发送消息时出错:', error);
    antMessage.error('发送消息时出错');
  } finally {
    sending.value = false;
    streamingMessage.value = '';
    streamingMessageType.value = 'dialog';
    await nextTick();
    scrollToBottom();
  }
};

// 模拟深度思考过程流式输出
const simulateDeepThinkingProcess = async (query: string) => {
  let thinkingProcess = '';

  if (query.includes('意义')) {
    thinkingProcess = `**深度思考过程**：

1. 首先分析问题的核心概念
   - 问题涉及"意义"这一哲学概念
   - 需要从多个维度进行分析

2. 多角度分析
   - 个人层面：意义与价值观的关系
   - 社会层面：意义与集体认同的关系
   - 存在层面：意义与生命本质的关系

3. 综合思考
   - 意义是主观与客观的结合
   - 意义需要在实践中不断构建和重构

这是启用深度思考模式后的分析过程。`;
  } else {
    thinkingProcess = `**深度思考分析过程**：

1. 问题理解
   - 用户询问：${query}
   - 关键词识别：${query.substring(0, Math.min(10, query.length))}...

2. 知识检索
   - 检索相关领域知识
   - 分析问题的多个维度

3. 推理过程
   - 逻辑分析各要素关系
   - 形成初步解答框架

4. 验证与优化
   - 检查解答的合理性
   - 优化表达方式

以上是深度思考的主要过程。`;
  }

  // 设置流式显示类型为思考
  streamingMessageType.value = 'thinking';

  // 模拟逐字显示效果（流式传输）
  for (let i = 0; i < thinkingProcess.length; i++) {
    streamingMessage.value += thinkingProcess.charAt(i);
    if (i % 3 === 0) {
      // 控制刷新频率，避免过于频繁
      await nextTick();
      scrollToBottom();
    }
    await new Promise(resolve => setTimeout(resolve, 10)); // 控制打字速度
  }

  // 将完整思考过程添加到消息列表
  messages.value.push({
    role: 'assistant',
    content: streamingMessage.value,
    type: 'thinking'
  });

  streamingMessage.value = '';
  streamingMessageType.value = 'dialog';
  await nextTick();
  scrollToBottom();

  // 等待一段时间再继续
  await new Promise(resolve => setTimeout(resolve, 500));
};

// 模拟SSE流式消息接收
const simulateStreamResponse = async (query: string) => {
  // 模拟不同类型问题的回复
  let responseText = '';

  if (query.includes('你好') || query.includes('hello')) {
    responseText = '您好！很高兴为您服务。有什么我可以帮您的吗？';
  } else if (query.includes('天气')) {
    responseText = '要获取天气信息，建议您开启联网搜索功能，这样我可以为您提供实时的天气数据。';
  } else if (webSearchEnabled.value && query.includes('新闻')) {
    responseText =
      '根据我的联网搜索结果，最近的重要新闻包括：\n\n1. 科技领域有了新突破\n2. 经济形势持续恢复\n3. 教育政策有所调整\n\n请注意这些是模拟数据，实际使用时会连接真实的数据源。';
  } else if (deepThinkingMode.value && query.includes('意义')) {
    responseText =
      '关于您提出的意义问题，经过深度思考，我认为这个问题涉及多个层面：\n\n首先，从个人层面来看，意义往往与我们的价值观和人生目标密切相关...\n其次，从社会层面分析，意义也体现在我们与他人的关系和社会贡献中...\n最后，综合考虑各方面因素，意义不是固定不变的，而是需要在生活实践中不断探索和构建的...\n\n这是启用深度思考模式后的分析结果。';
  } else {
    responseText = `我理解您的问题是："${query}"。作为AI助手，我可以告诉您，这是一个很有意思的问题。${webSearchEnabled.value ? '我已经通过联网搜索获取了相关信息。' : ''}${deepThinkingMode.value ? '经过深度思考，我的分析如下：' : '我的建议是：'}\n\n1. 第一点看法...\n2. 第二点分析...\n3. 最后总结...\n\n希望这个回答对您有所帮助！`;
  }

  // 设置流式显示类型为对话
  streamingMessageType.value = 'dialog';

  // 模拟逐字显示效果（SSE流式传输）
  for (let i = 0; i < responseText.length; i++) {
    streamingMessage.value += responseText.charAt(i);
    if (i % 3 === 0) {
      // 控制刷新频率，避免过于频繁
      await nextTick();
      scrollToBottom();
    }
    await new Promise(resolve => setTimeout(resolve, 20)); // 控制打字速度
  }

  // 将完整消息添加到消息列表
  messages.value.push({
    role: 'assistant',
    content: streamingMessage.value,
    type: 'dialog'
  });

  streamingMessage.value = '';
};

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 添加窗口大小变化时的处理
onMounted(() => {
  window.addEventListener('resize', scrollToBottom);
  scrollToBottom();
});

onUnmounted(() => {
  window.removeEventListener('resize', scrollToBottom);
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.chat-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.chat-controls {
  display: flex;
  gap: 8px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 60px 0;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 800px;
  margin: 0 auto;

  /* 隐藏滚动条 */
  ::-webkit-scrollbar {
    display: none;
  }
  &::-webkit-scrollbar {
    display: none;
  }
}

.message {
  display: flex;
  gap: 12px;
  max-width: 100%;
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.avatar {
  flex-shrink: 0;
}

.content {
  flex: 1;
  min-width: 0;
}

.text {
  position: relative;
}

.message-content {
  border-radius: 8px;
  line-height: 1.75;
  font-size: 16px;
  white-space: pre-wrap;
  word-break: break-word;
}

.deep-thinking-streaming,
.deep-thinking-content {
  border: 1px dashed #9254de;
  background-color: #f9f0ff;
}

.message.user .message-content {
  background: #1890ff;
  color: white;
  border-top-right-radius: 0;
  padding: 6px 10px;
}

.message.assistant .message-content {
  background: white;
  border-top-left-radius: 0;
}

.thinking-indicator,
.searching-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  margin-bottom: 8px;
  color: #d48806;
}

.streaming .message-content {
  background: white;
}

.deep-thinking-header {
  margin-bottom: 8px;
}

@media (max-width: 768px) {
  .chat-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .chat-controls {
    justify-content: flex-end;
  }
}
</style>
