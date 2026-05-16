<template>
  <main class="story-page">
    <section class="story-shell">
      <!-- 游戏头部 -->
      <header class="story-header">
        <div>
          <p class="eyebrow">// TEXT ADVENTURE</p>
          <h1 class="game-title">地下城文字游戏</h1>
        </div>
        <button class="ghost-button" type="button" @click="restart">RESET</button>
      </header>

      <!-- 角色状态栏 -->
      <section class="status-grid" aria-label="角色状态">
        <div class="status-item" :class="{ 'low-hp': state.hp <= 25 }">
          <span class="status-label">HP.</span>
          <strong class="status-value">{{ state.hp }}</strong>
        </div>
        <div class="status-item">
          <span class="status-label">GOLD.</span>
          <strong class="status-value">{{ state.gold }}</strong>
        </div>
        <div class="status-item inventory-card">
          <span class="status-label">INV.</span>
          <strong class="status-value inventory-text">{{ inventoryText }}</strong>
        </div>
      </section>

      <!-- 场景描述面板 -->
      <section class="scene-panel">
        <div class="scene-mark-wrapper">
          <span class="scene-mark"># {{ currentNode.id }}</span>
        </div>
        <!-- 💡 动态输出打字机文本 -->
        <p class="scene-text">{{ displayedText }}<span v-if="isTyping" class="type-cursor">_</span></p>
      </section>

      <!-- 行动选项 -->
      <section class="option-list" :class="{ 'is-waiting': isTyping }" aria-label="行动选项">
        <button
          v-for="(option, index) in currentNode.options"
          :key="option.text"
          class="option-button"
          :class="{
            'is-disabled': !canChoose(option) || isTyping,
            'is-checkbox': isCheckboxOption(option),
            'is-radio': !isCheckboxOption(option)
          }"
          type="button"
          :disabled="!canChoose(option) || isTyping"
          @click="choose(option)"
        >
          <!-- 极简几何选择器 -->
          <div class="choice-indicator">
            <!-- 多选/复选：极简正方形 -->
            <div v-if="isCheckboxOption(option)" class="mock-checkbox"></div>
            <!-- 单选：极简圆圈 -->
            <div v-else class="mock-radio"></div>
          </div>

          <span class="option-text">
            <span class="option-index">0{{ index + 1 }}.</span>
            {{ option.text }}
          </span>

          <span v-if="!canChoose(option)" class="badge-disabled">LOCKED</span>
          <span v-else class="option-arrow">::</span>
        </button>
      </section>

      <!-- 冒险日志 -->
      <section class="journal" aria-label="冒险日志">
        <div class="journal-title">// LOGS</div>
        <transition-group name="log-list" tag="ol" class="journal-list">
          <li v-for="(item, index) in logs" :key="item + index" class="journal-item">
            {{ item }}
          </li>
        </transition-group>
      </section>
    </section>

    <!-- 极简通知悬浮窗 -->
    <div class="toast-container">
      <transition-group name="toast-fade">
        <div v-for="toast in toasts" :key="toast.id" class="toast-item" :class="toast.type">
          {{ toast.message }}
        </div>
      </transition-group>
    </div>

    <!-- 全屏极简结算大幕 -->
    <transition name="fade">
      <section v-if="isGameOver || isGameWon" class="end-screen-overlay" :class="{ 'is-win': isGameWon }">
        <div class="end-screen-content">
          <h2 class="end-title">{{ isGameWon ? 'SUCCESS' : 'TERMINATED' }}</h2>
          <p class="end-desc">
            {{ isGameWon ? '你解开了所有的谜题，成功撤离地下城。' : '生命体征归零，本次探索已终止。' }}
          </p>
          <div class="end-stats">
            <span>GOLD: {{ state.gold }}</span>
            <span>ITEMS: {{ state.inventory.length }}</span>
          </div>
          <button class="primary-button" type="button" @click="restart">RESTART</button>
        </div>
      </section>
    </transition>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { createInitialState, storyData, type StoryNode, type StoryOption } from './story-data'

interface Toast {
  id: number
  message: string
  type: 'gain' | 'lose' | 'info'
}

const state = reactive(createInitialState())
const currentId = ref('start')
const logs = ref<string[]>([])
const toasts = ref<Toast[]>([])
let toastIdCounter = 0

// 打字机逻辑控制
const displayedText = ref('')
const isTyping = ref(false)
let typingTimer: number | null = null

const isGameOver = computed(() => state.hp <= 0)
const isGameWon = computed(() => !!state.flags.gameFinished)

const getNode = (id: string): StoryNode => {
  const node = storyData.get(id)
  if (!node) throw new Error(`Story node "${id}" does not exist.`)
  return node
}

const currentNode = computed(() => getNode(currentId.value))
const inventoryText = computed(() => (state.inventory.length ? state.inventory.join(' / ') : 'NONE'))

const isCheckboxOption = (option: StoryOption) => option.nextId === currentId.value

// 💡 极简打字机效果核心函数
const startTypingEffect = (text: string) => {
  if (typingTimer) clearInterval(typingTimer)
  displayedText.value = ''
  isTyping.value = true

  let index = 0
  typingTimer = window.setInterval(() => {
    if (index < text.length) {
      displayedText.value += text.charAt(index)
      index++
    } else {
      if (typingTimer) clearInterval(typingTimer)
      isTyping.value = false
    }
  }, 35) // 每个字打印速度（毫秒）
}

const showToast = (message: string, type: 'gain' | 'lose' | 'info' = 'info') => {
  const id = toastIdCounter++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 2000)
}

// 状态变动监控
watch(
  () => ({ hp: state.hp, gold: state.gold, invLength: state.inventory.length }),
  (newVal, oldVal) => {
    if (newVal.hp > oldVal.hp) showToast(`[ STATUS ] HP +${newVal.hp - oldVal.hp}`, 'gain')
    if (newVal.hp < oldVal.hp) showToast(`[ STATUS ] HP -${oldVal.hp - newVal.hp}`, 'lose')
    if (newVal.gold > oldVal.gold) showToast(`[ ASSETS ] GOLD +${newVal.gold - oldVal.gold}`, 'gain')
    if (newVal.gold < oldVal.gold) showToast(`[ ASSETS ] GOLD -${oldVal.gold - newVal.gold}`, 'lose')
    if (newVal.invLength > oldVal.invLength) {
      const newItem = state.inventory[state.inventory.length - 1]
      showToast(`[ POCKET ] ADDED: ${newItem}`, 'gain')
    }
  }
)

// 监听场景切换触发打字机
watch(
  currentId,
  () => {
    startTypingEffect(currentNode.value.text)
  },
  { immediate: true }
)

const log = (message: string) => {
  logs.value.unshift(message)
  logs.value = logs.value.slice(0, 5)
}

const enterNode = (nextId: string) => {
  currentId.value = nextId
  currentNode.value.onEnter?.(state)
  log(`ENTERED: [${nextId.toUpperCase()}]`)
}

const canChoose = (option: StoryOption) => !option.condition || option.condition(state)

const choose = (option: StoryOption) => {
  if (!canChoose(option) || isTyping.value) return

  currentNode.value.onExit?.(state)
  option.action?.(state)
  log(`ACTION: ${option.text}`)

  if (state.hp <= 0) return
  enterNode(option.nextId)
}

const restart = () => {
  const freshState = createInitialState()
  state.hp = freshState.hp
  state.gold = freshState.gold
  state.inventory = freshState.inventory
  state.flags = freshState.flags
  logs.value = []
  toasts.value = []
  enterNode('start')
}
</script>

<style scoped>
/* 极致极简变量：全黑背景与冷白文本 */
.story-page {
  --bg-main: #0a0a0c;
  --border-subtle: #222226;
  --text-main: #e4e4e7;
  --text-muted: #71717a;
  --accent-blue: #3b82f6;
  --accent-purple: #a855f7;

  min-height: 100vh;
  background-color: var(--bg-main);
  color: var(--text-main);
  padding: 50px 24px;
  /* 采用经典等宽及现代无衬线字体组合 */
  font-family: 'Courier New', Courier, Menlo, Monaco, Consolas, monospace;
  -webkit-font-smoothing: antialiased;
}

.story-shell {
  width: min(760px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* 游戏头部 */
.story-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 16px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.1em;
}

.game-title {
  margin: 0;
  font-size: 20px;
  font-weight: 400;
  color: var(--text-main);
}

.ghost-button {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 11px;
  padding: 6px 14px;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: all 0.15s ease;
}
.ghost-button:hover {
  border-color: #ef4444;
  color: #ef4444;
}

/* 角色状态栏 */
.status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background-color: var(--border-subtle);
}

.status-item {
  background-color: var(--bg-main);
  padding: 14px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.status-label {
  color: var(--text-muted);
  font-size: 11px;
}

.status-value {
  font-size: 18px;
  font-weight: 400;
}

.low-hp .status-value {
  color: #f87171;
  animation: blink 1s infinite steps(1);
}
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.inventory-card .inventory-text {
  font-size: 13px;
  color: var(--text-main);
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 场景描述面板 */
.scene-panel {
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle);
}
.scene-mark-wrapper {
  margin-bottom: 16px;
}
.scene-mark {
  color: var(--text-muted);
  font-size: 12px;
}

.scene-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-main);
  white-space: pre-wrap;
}

/* 打字机光标动画 */
.type-cursor {
  font-weight: bold;
  animation: cursorBlink 0.8s infinite;
}
@keyframes cursorBlink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* 行动选项列表 */
.option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: opacity 0.25s ease;
}
/* 打字未完成时，降低选项区域的不透明度 */
.option-list.is-waiting {
  opacity: 0.25;
  pointer-events: none;
}

.option-button {
  background: transparent;
  border: 1px solid var(--border-subtle);
  padding: 14px 18px;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

/* 极简悬停：只变动线条颜色 */
.option-button:hover:not(:disabled).is-radio {
  border-color: var(--accent-blue);
}
.option-button:hover:not(:disabled).is-checkbox {
  border-color: var(--accent-purple);
}

.choice-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 极简正方形复选框 */
.mock-checkbox {
  width: 10px;
  height: 10px;
  border: 1px solid var(--text-muted);
  transition: all 0.2s;
}
.is-checkbox:hover:not(:disabled) .mock-checkbox {
  border-color: var(--accent-purple);
  background: var(--accent-purple);
}

/* 极简圆形单选框 */
.mock-radio {
  width: 10px;
  height: 10px;
  border: 1px solid var(--text-muted);
  border-radius: 50%;
  transition: all 0.2s;
}
.is-radio:hover:not(:disabled) .mock-radio {
  border-color: var(--accent-blue);
  background: var(--accent-blue);
}

.option-text {
  font-size: 14px;
  flex-grow: 1;
  color: var(--text-main);
}
.option-index {
  color: var(--text-muted);
  margin-right: 4px;
}
.option-arrow {
  color: var(--text-muted);
  font-size: 12px;
}
.option-button:hover:not(:disabled) .option-arrow {
  color: var(--text-main);
}

.option-button.is-disabled {
  cursor: not-allowed;
  opacity: 0.3;
  border-color: var(--border-subtle);
}
.badge-disabled {
  font-size: 11px;
  color: #ef4444;
  letter-spacing: 0.05em;
}

/* 冒险日志 */
.journal {
  border-top: 1px dashed var(--border-subtle);
  padding-top: 24px;
}
.journal-title {
  color: var(--text-muted);
  font-size: 11px;
  margin-bottom: 12px;
  letter-spacing: 0.05em;
}
.journal-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.journal-item {
  color: var(--text-muted);
  font-size: 12px;
}
.journal-item:first-child {
  color: var(--text-main);
}

.log-list-enter-active {
  transition: all 0.25s ease;
}
.log-list-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

/* 极简浮动通知 */
.toast-container {
  position: fixed;
  bottom: 32px;
  right: 32px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}
.toast-item {
  padding: 10px 16px;
  border: 1px solid #333;
  background: #000;
  font-size: 11px;
  color: #fff;
}
.toast-item.gain {
  border-color: #22c55e;
  color: #22c55e;
}
.toast-item.lose {
  border-color: #ef4444;
  color: #ef4444;
}
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.2s ease;
}
.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.toast-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 极简全屏大幕 */
.end-screen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}
.end-screen-content {
  max-width: 400px;
  text-align: center;
  padding: 0 20px;
}
.end-title {
  font-size: 28px;
  font-weight: 300;
  margin: 0 0 12px;
  letter-spacing: 4px;
}
.is-win .end-title {
  color: #60a5fa;
}
.end-desc {
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 32px;
}
.end-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 32px;
}
.primary-button {
  background: transparent;
  border: 1px solid var(--text-main);
  color: var(--text-main);
  padding: 12px 40px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.primary-button:hover {
  background: var(--text-main);
  color: #000;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计适配 */
@media (max-width: 640px) {
  .story-page {
    padding: 32px 16px;
  }
  .status-grid {
    grid-template-columns: 1fr;
    gap: 1px;
  }
  .status-item {
    padding: 10px 14px;
  }
  .inventory-card .inventory-text {
    max-width: none;
  }
  .toast-container {
    left: 16px;
    right: 16px;
    bottom: 16px;
  }
  .toast-item {
    text-align: center;
  }
}
</style>
