<template>
  <main class="term-raw">
    <div class="term-wrapper">
      <!-- 状态栏 -->
      <section class="term-status">
        <span class="status-node"><span class="status-lbl">HP:</span> {{ state.hp }}</span>
        <span class="status-sep">|</span>
        <span class="status-node"><span class="status-lbl">GOLD:</span> {{ state.gold }}</span>
        <span class="status-sep">|</span>
        <span class="status-node"><span class="status-lbl">INV:</span> {{ inventoryText }}</span>
      </section>

      <!-- 剧情显示区 -->
      <section class="term-output">
        <p class="term-text">{{ displayedText }}<span class="term-cursor" :class="{ 'is-typing': isTyping }">█</span></p>
      </section>

      <!-- 指令交互区 -->
      <section class="term-input" :class="{ 'is-blocked': isTyping }">
        <div
          v-for="(option, index) in currentNode.options"
          :key="getOptionKey(option, index)"
          class="term-cmd"
          :class="{
            'is-selected': isSelectedOption(option, index),
            'is-locked': !canChoose(option)
          }"
          @click="selectOption(option, index)"
        >
          <!-- 核心修正：确保选中后符号切实切换为实心 -->
          <span class="term-symbol">
            <template v-if="isCheckboxOption(option)">
              {{ isSelectedOption(option, index) ? '■' : '□' }}
            </template>
            <template v-else>
              {{ isSelectedOption(option, index) ? '●' : '○' }}
            </template>
          </span>

          <span class="term-label">0{{ index + 1 }}. {{ option.text }}</span>
          <span v-if="!canChoose(option)" class="term-badge">[LOCKED]</span>
        </div>

        <!-- 确认按钮区 -->
        <transition name="fade">
          <div v-if="selectedOption && !isTyping" class="confirm-area">
            <button class="execute-btn" @click="confirmChoice">> CONFIRM EXECUTION_</button>
          </div>
        </transition>
      </section>

      <!-- 历史日志区 -->
      <section class="term-logs">
        <div v-for="(log, i) in logs" :key="i" class="log-line">>> {{ log }}</div>
      </section>
    </div>

    <!-- 结算层 -->
    <transition name="fade">
      <section v-if="isGameOver || isGameWon" class="raw-overlay">
        <div class="raw-box">
          <p class="raw-title">{{ isGameWon ? '== SUCCESS ==' : '== SYSTEM FAILURE ==' }}</p>
          <p class="raw-desc">{{ isGameWon ? 'All protocols executed successfully.' : 'Life support systems offline.' }}</p>
          <button class="reboot-btn" @click="restart">[ REBOOT SYSTEM ]</button>
        </div>
      </section>
    </transition>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { createInitialState, storyData, type StoryOption } from './story-data'

// --- 游戏状态管理 ---
const state = reactive(createInitialState())
const currentId = ref('start')
const logs = ref<string[]>([])
const displayedText = ref('')
const isTyping = ref(false)
const selectedOption = ref<StoryOption | null>(null)
const selectedOptionKey = ref<string | null>(null)
let typingTimer: any = null

// --- 计算属性 ---
const currentNode = computed(() => storyData.get(currentId.value)!)
const inventoryText = computed(() => state.inventory.join(', ') || 'NONE')
const isGameOver = computed(() => state.hp <= 0)
const isGameWon = computed(() => !!state.flags.gameFinished)
const isCheckboxOption = (opt: StoryOption) => opt.nextId === currentId.value
const getOptionKey = (opt: StoryOption, index: number) => `${currentId.value}:${index}:${opt.nextId}:${opt.text}`
const isSelectedOption = (opt: StoryOption, index: number) => selectedOptionKey.value === getOptionKey(opt, index)

// --- 打字机效果 ---
const startTyping = (text: string) => {
  if (typingTimer) clearInterval(typingTimer)
  displayedText.value = ''
  isTyping.value = true
  selectedOption.value = null
  selectedOptionKey.value = null

  let i = 0
  typingTimer = setInterval(() => {
    if (i < text.length) {
      displayedText.value += text.charAt(i)
      i++
    } else {
      clearInterval(typingTimer)
      isTyping.value = false
    }
  }, 25)
}

watch(currentId, () => startTyping(currentNode.value.text), { immediate: true })

// --- 交互逻辑 ---
const selectOption = (opt: StoryOption, index: number) => {
  if (isTyping.value || !canChoose(opt)) return
  selectedOption.value = opt
  selectedOptionKey.value = getOptionKey(opt, index)
}

const confirmChoice = () => {
  if (!selectedOption.value) return
  const opt = selectedOption.value

  currentNode.value.onExit?.(state)
  opt.action?.(state)

  if (state.hp <= 0) return

  if (opt.nextId !== currentId.value) {
    currentId.value = opt.nextId
    currentNode.value.onEnter?.(state)
  } else {
    selectedOption.value = null
    selectedOptionKey.value = null
    log('指令已处理')
  }
}

const canChoose = (opt: StoryOption) => !opt.condition || opt.condition(state)

const log = (msg: string) => {
  logs.value.unshift(msg)
  logs.value = logs.value.slice(0, 3)
}

const restart = () => location.reload()
</script>

<style scoped>
/* 核心变量：黑白极简 */
.term-raw {
  --bg: #000000;
  --white: #ffffff;
  --gray-light: #ffffff;
  --gray-muted: #ffffff;
  --gray-dark: #ffffff;

  background-color: var(--bg);
  color: var(--gray-light);
  min-height: 100vh;
  padding: 50px 20px;
  font-family: 'Courier New', Courier, monospace;
  touch-action: manipulation;
}

.term-wrapper {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* 状态栏 */
.term-status {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  color: var(--white);
  font-size: 13px;
  letter-spacing: 1px;
  border: 1px solid var(--gray-dark);
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
}
.status-lbl {
  color: var(--gray-muted);
}
.status-sep {
  color: var(--gray-dark);
}

/* 剧情显示 */
.term-output {
  min-height: 120px;
  padding: 0 4px;
}
.term-text {
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-wrap;
  margin: 0;
  letter-spacing: 0.5px;
}
.term-cursor {
  margin-left: 6px;
  animation: blink 0.8s steps(1) infinite;
  color: var(--white);
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}

/* 指令区 */
.term-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: opacity 0.3s ease;
}
.term-input.is-blocked {
  opacity: 0.15;
  pointer-events: none;
}

/* 选项基础样式 */
.term-cmd {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  cursor: pointer;
  color: var(--gray-muted);
  border: 1px solid transparent;
  transition: all 0.12s ease-in-out;
}

/* 选中高亮样式：白底黑字 */
.term-cmd.is-selected {
  color: #000000 !important;
  background-color: var(--white) !important;
  border-color: var(--white) !important;
  font-weight: bold;
}

/* 选中时，强制符号颜色也变为黑色，并微微放大，确保能明显看到实心变化 */
.term-cmd.is-selected .term-symbol {
  color: #000000;
  transform: scale(1.1);
}

/* 悬停未选中的选项 */
.term-cmd:not(.is-selected):not(.is-locked):hover {
  color: var(--white);
  border-color: var(--gray-dark);
  background: rgba(255, 255, 255, 0.03);
}

/* 选项前缀符号 */
.term-symbol {
  width: 28px;
  font-size: 16px;
  flex-shrink: 0;
  display: inline-block;
  transition: transform 0.1s;
}

.term-label {
  flex-grow: 1;
  font-size: 15px;
}

/* 锁定状态 */
.term-cmd.is-locked {
  cursor: not-allowed;
  text-decoration: line-through;
}
.term-badge {
  font-size: 11px;
  margin-left: 10px;
  padding: 1px 4px;
  border: 1px solid #7f1d1d;
  color: #ef4444;
}

/* 确认执行区域 */
.confirm-area {
  margin-top: 10px;
}
.execute-btn {
  width: 100%;
  background: transparent;
  color: var(--white);
  border: 1px solid var(--white);
  padding: 16px;
  font-family: monospace;
  font-weight: bold;
  font-size: 14px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.1s;
}
.execute-btn:hover {
  background: var(--white);
  color: #000;
}
.execute-btn:active {
  background: var(--gray-light);
  transform: scale(0.99);
}

/* 日志区 */
.term-logs {
  border-top: 1px dashed var(--gray-dark);
  padding-top: 25px;
  color: #ffffff;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 结算弹窗 */
.raw-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}
.raw-box {
  text-align: center;
  border: 2px solid var(--white);
  background: #000;
  padding: 40px 60px;
  max-width: 90%;
}
.raw-title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 15px;
  letter-spacing: 2px;
}
.raw-desc {
  color: var(--gray-muted);
  margin-bottom: 35px;
  font-size: 14px;
}
.reboot-btn {
  background: transparent;
  border: 1px solid var(--white);
  color: var(--white);
  padding: 12px 40px;
  font-family: monospace;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.reboot-btn:hover {
  background: var(--white);
  color: #000;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .term-raw {
    padding: 30px 15px;
  }
  .term-wrapper {
    gap: 30px;
  }
  .term-cmd {
    padding: 16px 10px;
  }
  .raw-box {
    padding: 30px 20px;
  }
}
</style>
