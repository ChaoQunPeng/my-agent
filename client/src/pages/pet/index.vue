<template>
  <div class="ai-pet-container">
    <div class="pet-card" :class="{ 'is-speaking': isSpeaking }">
      <!-- 宠物头像/图标区域 -->
      <div class="pet-avatar" @click="triggerInteraction">
        <div class="pet-glow"></div>
        <div class="pet-emoji">{{ currentEmoji }}</div>
        <div class="pet-thought-bubble" v-if="showThought">
          {{ thoughtText }}
        </div>
      </div>

      <!-- 宠物状态栏 -->
      <div class="pet-status">
        <div class="status-item">
          <span class="status-label">心情</span>
          <div class="progress-bar">
            <div class="progress-fill mood" :style="{ width: moodLevel + '%' }"></div>
          </div>
        </div>
        <div class="status-item">
          <span class="status-label">精力</span>
          <div class="progress-bar">
            <div class="progress-fill energy" :style="{ width: energyLevel + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 对话区域 -->
      <div class="chat-area">
        <div class="chat-messages" ref="chatMessagesRef">
          <div v-for="(msg, idx) in messages" :key="idx" :class="['message', msg.role]">
            <div class="message-bubble">
              <span class="message-text">{{ msg.content }}</span>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <input v-model="userInput" @keyup.enter="sendMessage" placeholder="对宠物说点什么..." :disabled="isLoading" class="pet-input" />
          <button @click="sendMessage" :disabled="isLoading || !userInput.trim()" class="send-btn">
            <span v-if="!isLoading">发送</span>
            <span v-else class="loading-spinner"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- 快捷互动按钮 -->
    <div class="action-buttons">
      <button @click="quickAction('feed')" class="action-btn">🍖 喂食</button>
      <button @click="quickAction('play')" class="action-btn">🎾 玩耍</button>
      <button @click="quickAction('sleep')" class="action-btn">😴 睡觉</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'

// 状态定义
const userInput = ref('')
const isLoading = ref(false)
const isSpeaking = ref(false)
const showThought = ref(false)
const thoughtText = ref('')
const moodLevel = ref(70)
const energyLevel = ref(80)
const currentEmoji = ref('🐱')
const chatMessagesRef = ref<HTMLElement>()

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<Message[]>([{ role: 'assistant', content: '喵~ 你好呀！我是你的AI宠物小伙伴，今天想和我玩什么呀？' }])

// 模拟API调用（请替换为真实的DeepSeek API）
const callDeepSeekAPI = async (userMessage: string): Promise<string> => {
  // TODO: 请替换为您的实际API调用
  // 示例：使用fetch调用DeepSeek API
  /*
  const response = await fetch('YOUR_DEEPSEEK_API_ENDPOINT', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: JSON.stringify({
      messages: [...messages.value, { role: 'user', content: userMessage }],
      temperature: 0.7,
      max_tokens: 150
    })
  })
  const data = await response.json()
  return data.choices[0].message.content
  */

  // 模拟响应（演示用）
  await new Promise(resolve => setTimeout(resolve, 800))
  const responses = [
    '喵~ 今天天气真好呢！(◕‿◕)',
    '主人真好，我最喜欢和你聊天啦！',
    '咕噜咕噜~ 摸摸头好舒服~',
    '诶？这个好有趣！再和我说说嘛~',
    '喵喵！我有点饿了，想吃小鱼干~'
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return

  const userMsg = userInput.value.trim()
  messages.value.push({ role: 'user', content: userMsg })
  userInput.value = ''

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  isLoading.value = true
  isSpeaking.value = true

  // 根据消息内容调整情绪
  updateMoodBasedOnMessage(userMsg)

  try {
    // 显示思考气泡
    showThoughtBubble('思考中...')

    const reply = await callDeepSeekAPI(userMsg)

    hideThoughtBubble()
    messages.value.push({ role: 'assistant', content: reply })

    // 根据回复更新宠物状态
    updatePetStateFromReply(reply)

    // 随机改变表情
    changeEmotionEmoji(reply)
  } catch (error) {
    console.error('API调用失败:', error)
    messages.value.push({
      role: 'assistant',
      content: '喵？信号不太好，主人能再说一遍吗？'
    })
  } finally {
    isLoading.value = false
    isSpeaking.value = false
    await nextTick()
    scrollToBottom()
  }
}

// 快速动作
const quickAction = (action: string) => {
  let actionMessage = ''
  switch (action) {
    case 'feed':
      actionMessage = '喂宠物吃小鱼干'
      moodLevel.value = Math.min(100, moodLevel.value + 10)
      energyLevel.value = Math.min(100, energyLevel.value + 5)
      currentEmoji.value = '😋'
      setTimeout(() => {
        if (currentEmoji.value === '😋') currentEmoji.value = '🐱'
      }, 2000)
      break
    case 'play':
      actionMessage = '和宠物一起玩耍'
      moodLevel.value = Math.min(100, moodLevel.value + 15)
      energyLevel.value = Math.max(0, energyLevel.value - 10)
      currentEmoji.value = '🎾'
      setTimeout(() => {
        if (currentEmoji.value === '🎾') currentEmoji.value = '🐱'
      }, 2000)
      break
    case 'sleep':
      actionMessage = '让宠物睡觉休息'
      energyLevel.value = Math.min(100, energyLevel.value + 30)
      moodLevel.value = Math.min(100, moodLevel.value + 5)
      currentEmoji.value = '😴'
      setTimeout(() => {
        if (currentEmoji.value === '😴') currentEmoji.value = '🐱'
      }, 3000)
      break
  }

  messages.value.push({ role: 'user', content: actionMessage })
  setTimeout(() => sendMessage(), 100)
}

// 显示思考气泡
const showThoughtBubble = (text: string) => {
  thoughtText.value = text
  showThought.value = true
  setTimeout(() => {
    if (showThought.value && thoughtText.value === text) {
      hideThoughtBubble()
    }
  }, 1500)
}

const hideThoughtBubble = () => {
  showThought.value = false
  thoughtText.value = ''
}

// 根据用户消息更新心情
const updateMoodBasedOnMessage = (message: string) => {
  const positiveWords = ['喜欢', '可爱', '乖', '棒', '好', '爱', '谢谢']
  const negativeWords = ['坏', '笨', '讨厌', '蠢', '差']

  if (positiveWords.some(word => message.includes(word))) {
    moodLevel.value = Math.min(100, moodLevel.value + 5)
    currentEmoji.value = '😊'
    setTimeout(() => {
      if (currentEmoji.value === '😊') currentEmoji.value = '🐱'
    }, 1500)
  } else if (negativeWords.some(word => message.includes(word))) {
    moodLevel.value = Math.max(0, moodLevel.value - 5)
    currentEmoji.value = '😿'
    setTimeout(() => {
      if (currentEmoji.value === '😿') currentEmoji.value = '🐱'
    }, 1500)
  }
}

// 从回复更新宠物状态
const updatePetStateFromReply = (reply: string) => {
  if (reply.includes('饿') || reply.includes('吃')) {
    energyLevel.value = Math.max(0, energyLevel.value - 5)
  } else if (reply.includes('开心') || reply.includes('喜欢')) {
    moodLevel.value = Math.min(100, moodLevel.value + 8)
  }

  // 自动恢复
  if (energyLevel.value < 30) {
    currentEmoji.value = '😫'
    setTimeout(() => {
      if (currentEmoji.value === '😫') currentEmoji.value = '🐱'
    }, 2000)
  }
}

// 改变表情
const changeEmotionEmoji = (reply: string) => {
  if (reply.includes('？') || reply.includes('?')) {
    currentEmoji.value = '❓'
  } else if (reply.includes('！') || reply.includes('!')) {
    currentEmoji.value = '❗'
  } else if (reply.includes('哈哈') || reply.includes('喵~')) {
    currentEmoji.value = '😸'
  } else {
    currentEmoji.value = '🐱'
  }
  setTimeout(() => {
    if (
      currentEmoji.value !== '😋' &&
      currentEmoji.value !== '🎾' &&
      currentEmoji.value !== '😴' &&
      currentEmoji.value !== '😊' &&
      currentEmoji.value !== '😿' &&
      currentEmoji.value !== '😫'
    ) {
      currentEmoji.value = '🐱'
    }
  }, 1500)
}

// 触发互动（点击头像）
const triggerInteraction = () => {
  if (!isLoading.value) {
    currentEmoji.value = '✨'
    setTimeout(() => {
      if (currentEmoji.value === '✨') currentEmoji.value = '🐱'
    }, 800)
    sendMessage()
  }
}

// 滚动到底部
const scrollToBottom = () => {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

// 自动恢复能量和心情（每秒）
onMounted(() => {
  setInterval(() => {
    if (energyLevel.value < 100 && !isLoading.value) {
      energyLevel.value = Math.min(100, energyLevel.value + 0.5)
    }
    if (moodLevel.value > 0 && !isLoading.value && Math.random() > 0.9) {
      moodLevel.value = Math.max(0, moodLevel.value - 1)
    }
  }, 30000) // 每30秒更新一次
})
</script>

<style scoped>
.ai-pet-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.pet-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 32px;
  padding: 24px;
  box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.pet-card.is-speaking {
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.6);
  transform: scale(1.01);
}

.pet-avatar {
  position: relative;
  text-align: center;
  cursor: pointer;
  margin-bottom: 20px;
}

.pet-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 70%);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.pet-emoji {
  font-size: 80px;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  transition: transform 0.2s ease;
}

.pet-avatar:hover .pet-emoji {
  transform: scale(1.1);
}

.pet-thought-bubble {
  position: absolute;
  top: -20px;
  right: 20px;
  background: white;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: fadeInUp 0.3s ease;
}

.pet-thought-bubble::before {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 20px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}

.pet-status {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.2);
  padding: 12px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.status-item {
  flex: 1;
}

.status-label {
  display: block;
  font-size: 12px;
  color: white;
  margin-bottom: 6px;
  font-weight: 500;
}

.progress-bar {
  background: rgba(0, 0, 0, 0.2);
  height: 8px;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.progress-fill.mood {
  background: linear-gradient(90deg, #ff6b6b, #ffd93d);
}

.progress-fill.energy {
  background: linear-gradient(90deg, #a8e6cf, #3b8d6e);
}

.chat-area {
  background: white;
  border-radius: 24px;
  overflow: hidden;
  margin-top: 20px;
}

.chat-messages {
  height: 300px;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  animation: slideIn 0.3s ease;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 18px;
  background: #f0f0f0;
  color: #333;
}

.message.user .message-bubble {
  background: #667eea;
  color: white;
}

.message-text {
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
}

.input-area {
  display: flex;
  padding: 12px;
  background: white;
  border-top: 1px solid #e0e0e0;
  gap: 8px;
}

.pet-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.pet-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.send-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 24px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-1px);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  justify-content: center;
}

.action-btn {
  background: white;
  border: 1px solid #e0e0e0;
  padding: 8px 16px;
  border-radius: 40px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(1.1);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
