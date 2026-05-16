<template>
  <main class="term-raw">
    <div class="term-wrapper">
      <section class="term-status">
        <span class="status-node"><span class="status-lbl">HP:</span> {{ state.hp }}</span>
        <span class="status-sep">|</span>
        <span class="status-node"><span class="status-lbl">GOLD:</span> {{ state.gold }}</span>
        <span class="status-sep">|</span>
        <span class="status-node"><span class="status-lbl">INV:</span> {{ inventoryText }}</span>
      </section>

      <section class="term-output">
        <p class="term-text">{{ displayedText }}<span class="term-cursor" :class="{ 'is-typing': isTyping }">_</span></p>
      </section>

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
          <span class="term-symbol">
            <template v-if="isCheckboxOption(option)">
              {{ isSelectedOption(option, index) ? '■' : '□' }}
            </template>
            <template v-else>
              {{ isSelectedOption(option, index) ? '●' : '○' }}
            </template>
          </span>

          <span class="term-label">0{{ index + 1 }}. {{ option.text }}</span>
          <!-- <span v-if="!canChoose(option)" class="term-badge">[LOCKED]</span> -->
        </div>

        <transition name="fade">
          <div v-if="selectedOption && !isTyping" class="confirm-area">
            <button class="execute-btn" @click="confirmChoice">继续</button>
          </div>
        </transition>
      </section>

      <!-- <section class="term-logs">
        <div v-for="(log, i) in logs" :key="i" class="log-line">>> {{ log }}</div>
      </section> -->
    </div>

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

const state = reactive(createInitialState())
const currentId = ref('start')
const logs = ref<string[]>([])
const displayedText = ref('')
const isTyping = ref(false)
const selectedOption = ref<StoryOption | null>(null)
const selectedOptionKey = ref<string | null>(null)
let typingTimer: any = null

const currentNode = computed(() => storyData.get(currentId.value)!)
const inventoryText = computed(() => state.inventory.join(', ') || 'NONE')
const isGameOver = computed(() => state.hp <= 0)
const isGameWon = computed(() => !!state.flags.gameFinished)
const isCheckboxOption = (opt: StoryOption) => opt.nextId === currentId.value
const getOptionKey = (opt: StoryOption, index: number) => `${currentId.value}:${index}:${opt.nextId}:${opt.text}`
const isSelectedOption = (opt: StoryOption, index: number) => selectedOptionKey.value === getOptionKey(opt, index)

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
  }, 50)
}

watch(currentId, () => startTyping(currentNode.value.text), { immediate: true })

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

<style>
html,
body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>

<style scoped>
.term-raw {
  --bg: #000000;
  --white: #ffffff;
  --dim: #c2c2c2;
  --border: #27272a;

  background-color: var(--bg);
  color: var(--white);
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
  gap: 15px;
  font-size: 13px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 15px;
  color: var(--dim);
}
.status-node {
  color: var(--white);
}
.status-lbl {
  color: var(--dim);
  margin-right: 4px;
}

/* 剧情显示 */
.term-output {
  min-height: 100px;
}
.term-text {
  font-size: 16px;
  line-height: 1.7;
  margin: 0;
}
.term-cursor {
  margin-left: 6px;
  animation: blink 0.8s steps(1) infinite;
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
  gap: 4px;
}
.term-input.is-blocked {
  display: none;
  pointer-events: none;
}

/* 选项样式 - 精简版 */
.term-cmd {
  display: flex;
  align-items: center;
  padding: 10px 0; /* 去掉左右内边距，靠左对齐 */
  cursor: pointer;
  color: var(--dim);
  transition: all 0.1s ease;
}

/* 选中态：仅通过颜色、加粗和位移来强调 */
.term-cmd.is-selected {
  color: var(--white);
  font-weight: bold;
  /* 选中时轻轻向右滑，增加动效 */
  transform: translateX(4px);
}

.term-symbol {
  width: 24px;
  font-size: 18px;
  flex-shrink: 0;
  text-align: left;
}

.term-label {
  flex-grow: 1;
  font-size: 15px;
}

/* 锁定与徽章 */
.term-cmd.is-locked {
  cursor: not-allowed;
  text-decoration: line-through;
}
.term-badge {
  font-size: 11px;
  margin-left: 10px;
  color: #ef4444;
  border: 1px solid #7f1d1d;
  padding: 0 4px;
}

/* 确认区域 */
.confirm-area {
  margin-top: 20px;
  border-top: 1px dashed var(--border);
  padding-top: 20px;
  text-align: center;
}
.execute-btn {
  background: transparent;
  color: var(--white);
  border: 1px solid var(--white);
  padding: 10px 24px;
  font-family: monospace;
  font-size: 14px;
  letter-spacing: 1px;
  cursor: pointer;
  border-radius: 2px;
}
.execute-btn:hover {
  background: var(--white);
  color: #000;
}

/* 日志区 */
.term-logs {
  border-top: 1px solid var(--border);
  padding-top: 20px;
  color: var(--dim);
  font-size: 12px;
}

/* 结算弹窗 */
.raw-overlay {
  position: fixed;
  inset: 0;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.raw-box {
  text-align: center;
  border: 1px solid var(--white);
  padding: 40px;
}
.raw-title {
  font-size: 20px;
  margin-bottom: 10px;
}
.raw-desc {
  color: var(--dim);
  margin-bottom: 30px;
}
.reboot-btn {
  background: transparent;
  border: 1px solid var(--white);
  color: var(--white);
  padding: 10px 30px;
  cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
