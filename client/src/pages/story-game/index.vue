<template>
  <main class="term-raw">
    <div class="term-wrapper">
      <!-- 状态栏：支持移动端自适应换行 -->
      <section class="term-status" aria-label="状态">
        <span class="status-node">HP: {{ state.hp }}</span>
        <span class="status-split">/</span>
        <span class="status-node">GOLD: {{ state.gold }}</span>
        <span class="status-split">/</span>
        <span class="status-node">INV: {{ inventoryText }}</span>
      </section>

      <!-- 场景文本输出 -->
      <section class="term-output">
        <p class="term-text">{{ displayedText }}<span class="term-cursor" :class="{ 'is-typing': isTyping }">█</span></p>
      </section>

      <!-- 指令交互区：针对移动端优化了触摸热区 -->
      <section class="term-input" :class="{ 'is-blocked': isTyping }" aria-label="指令">
        <div
          v-for="(option, index) in currentNode.options"
          :key="option.text"
          class="term-cmd"
          :class="{ 'is-disabled': !canChoose(option) || isTyping }"
          @click="choose(option)"
        >
          <!-- 极简原生符号：[ ] 代表复选，( ) 代表单选 -->
          <span class="term-symbol">
            {{ isCheckboxOption(option) ? '[ ]' : '( )' }}
          </span>

          <span class="term-label">0{{ index + 1 }}. {{ option.text }}</span>

          <span v-if="!canChoose(option)" class="term-badge">[LOCKED]</span>
        </div>
      </section>

      <!-- 历史流水日志 -->
      <section class="term-logs" aria-label="历史">
        <div v-for="(item, index) in logs" :key="item + index" class="term-log-line">> {{ item }}</div>
      </section>
    </div>

    <!-- 结算大幕（全设备覆盖） -->
    <transition name="raw-fade">
      <section v-if="isGameOver || isGameWon" class="raw-overlay">
        <div class="raw-box">
          <p class="raw-title">== {{ isGameWon ? 'PROCESS COMPLETED' : 'PROCESS TERMINATED' }} ==</p>
          <p class="raw-desc">
            {{ isGameWon ? '所有核心数据已成功同步，连接安全关闭。' : '数据中断，本次进程已被迫终止。' }}
          </p>
          <div class="raw-dump">
            <div>GOLD: {{ state.gold }}</div>
            <div>ITEMS: {{ state.inventory.length }}</div>
          </div>
          <button class="raw-btn" type="button" @click="restart">[ RESTART ]</button>
        </div>
      </section>
    </transition>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { createInitialState, storyData, type StoryNode, type StoryOption } from './story-data'

const state = reactive(createInitialState())
const currentId = ref('start')
const logs = ref<string[]>([])

const displayedText = ref('')
const isTyping = ref(false)
let typingTimer: number | null = null

const isGameOver = computed(() => state.hp <= 0)
const isGameWon = computed(() => !!state.flags.gameFinished)

const getNode = (id: string): StoryNode => {
  const node = storyData.get(id)
  if (!node) throw new Error(`Node "${id}" not found.`)
  return node
}

const currentNode = computed(() => getNode(currentId.value))
const inventoryText = computed(() => (state.inventory.length ? state.inventory.join(', ') : 'NONE'))

const isCheckboxOption = (option: StoryOption) => option.nextId === currentId.value

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
  }, 25)
}

watch(
  currentId,
  () => {
    startTypingEffect(currentNode.value.text)
  },
  { immediate: true }
)

const log = (msg: string) => {
  logs.value.unshift(msg)
  logs.value = logs.value.slice(0, 3)
}

watch(
  () => ({ hp: state.hp, gold: state.gold, invLength: state.inventory.length }),
  (newVal, oldVal) => {
    if (newVal.hp !== oldVal.hp) log(`HP changed to ${newVal.hp}`)
    if (newVal.gold !== oldVal.gold) log(`GOLD changed to ${newVal.gold}`)
    if (newVal.invLength > oldVal.invLength) {
      log(`ADDED: ${state.inventory[state.inventory.length - 1]}`)
    }
  }
)

const enterNode = (nextId: string) => {
  currentId.value = nextId
  currentNode.value.onEnter?.(state)
}

const canChoose = (option: StoryOption) => !option.condition || option.condition(state)

const choose = (option: StoryOption) => {
  if (!canChoose(option) || isTyping.value) return

  currentNode.value.onExit?.(state)
  option.action?.(state)

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
  enterNode('start')
}
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
}
</style>

<style scoped>
.term-raw {
  --bg: #000000;
  --white: #e4e4e7;
  --gray: #71717a;
  --dark-gray: #27272a;

  min-height: 100vh;
  background-color: var(--bg);
  color: var(--white);
  padding: 40px 24px;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.6;

  /* 💡 移动端安全：防止页面在手机上被无意中双击放大 */
  touch-action: manipulation;
}

.term-wrapper {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* 状态栏结构化，便于移动端自适应 */
.term-status {
  color: var(--gray);
  border-bottom: 1px solid var(--dark-gray);
  padding-bottom: 12px;
  font-size: 13px;
  letter-spacing: -0.02em;
  display: flex;
  flex-wrap: wrap; /* 💡 屏幕不够宽时自动换行 */
  gap: 8px;
}
.status-split {
  color: var(--dark-gray);
}

/* 场景主文本 */
.term-output {
  min-height: 80px;
}
.term-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 光标 */
.term-cursor {
  color: var(--white);
  margin-left: 4px;
  animation: rawBlink 1s infinite steps(1);
  /* display: none; */
}
.term-cursor.is-typing {
  /* display: inline-block; */
  animation: none;
  opacity: 1;
}
@keyframes rawBlink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* 指令列表 */
.term-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.term-input.is-blocked {
  opacity: 0.1;
  pointer-events: none;
}

/* 💡 终端文本按钮：重点做了移动端触摸体验适配 */
.term-cmd {
  display: flex;
  align-items: flex-start; /* 适配长文本换行对齐 */
  cursor: pointer;
  padding: 8px 0; /* 💡 扩大了垂直方向的触摸热区（从4px增加到8px） */
  -webkit-tap-highlight-color: transparent; /* 去除手机端点击时的灰色阴影底色 */
}

/* 只有非移动设备下才触发 Hover 效果（防止手机端点击后出现常亮状态） */
@media (hover: hover) {
  .term-cmd:hover:not(.is-disabled) {
    color: #ffffff;
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
  }
}

.term-symbol {
  margin-right: 12px;
  color: var(--gray);
  flex-shrink: 0;
  user-select: none;
}

.term-label {
  flex-grow: 1;
  word-break: break-all;
}

.term-badge {
  color: var(--gray);
  font-size: 12px;
  margin-left: 8px;
  flex-shrink: 0;
}

.term-cmd.is-disabled {
  cursor: not-allowed;
  opacity: 0.25;
}

/* 历史流水日志 */
.term-logs {
  border-top: 1px dashed var(--dark-gray);
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.term-log-line {
  color: var(--gray);
  font-size: 13px;
}

/* 结算大幕 */
.raw-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.raw-box {
  width: 100%;
  max-width: 440px;
  text-align: left;
}
.raw-title {
  font-weight: bold;
  margin: 0 0 16px;
}
.raw-desc {
  color: var(--gray);
  font-size: 13px;
  margin: 0 0 24px;
}
.raw-dump {
  border: 1px solid var(--dark-gray);
  padding: 16px;
  color: var(--gray);
  font-size: 13px;
  margin-bottom: 24px;
}
.raw-btn {
  background: transparent;
  border: 1px solid var(--white);
  color: var(--white);
  padding: 12px 24px; /* 💡 扩大了重开按钮的触摸面积 */
  font-family: monospace;
  cursor: pointer;
  font-size: 13px;
  -webkit-tap-highlight-color: transparent;
}
@media (hover: hover) {
  .raw-btn:hover {
    background: var(--white);
    color: #000;
  }
}

.raw-fade-enter-active,
.raw-fade-leave-active {
  transition: opacity 0.2s ease;
}
.raw-fade-enter-from,
.raw-fade-leave-to {
  opacity: 0;
}

/* 💡 移动端小屏精准优化 */
@media (max-width: 640px) {
  .term-raw {
    padding: 24px 16px; /* 缩小页面四周外边距，给文本让出更多空间 */
  }
  .term-wrapper {
    gap: 24px;
  }
  .term-status {
    font-size: 12px;
    gap: 4px 8px; /* 换行时紧凑排列 */
  }
  .status-split {
    display: none; /* 💡 手机端换行后，隐藏原本的单行斜杠，保持界面干净 */
  }
  .term-cmd {
    padding: 12px 0; /* 💡 手机端进一步放大手指点按区域 */
  }
}
</style>
