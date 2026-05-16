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

      <section class="mode-switch" aria-label="阅读模式">
        <button class="mode-btn" :class="{ 'is-active': viewMode === 'chapter' }" type="button" @click="viewMode = 'chapter'">
          当前节点
        </button>
        <button class="mode-btn" :class="{ 'is-active': viewMode === 'novel' }" type="button" @click="viewMode = 'novel'">连续小说</button>
      </section>

      <div ref="mainContentRef" class="main-content">
        <section class="term-output">
          <p v-if="viewMode === 'chapter'" class="term-text">
            {{ displayedText }}<span class="term-cursor" :class="{ 'is-typing': isTyping }">_</span>
          </p>

          <article v-else class="novel-flow">
            <section v-for="chapter in completedChapters" :key="chapter.key" class="novel-chapter">
              <!-- <p class="chapter-title">第 {{ chapter.index }} 节</p> -->
              <p class="term-text">{{ chapter.text }}</p>
              <p v-if="chapter.choiceText" class="chapter-choice">你：{{ chapter.choiceText }}</p>
            </section>

            <section class="novel-chapter is-current">
              <!-- <p class="chapter-title">第 {{ currentChapterIndex }} 节</p> -->
              <p class="term-text">{{ displayedText }}<span class="term-cursor" :class="{ 'is-typing': isTyping }">_</span></p>
            </section>
          </article>
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
              {{ isSelectedOption(option, index) ? '●' : '○' }}
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
      </div>

      <!-- <section class="term-logs">
        <div v-for="(log, i) in logs" :key="i" class="log-line">>> {{ log }}</div>
      </section> -->
    </div>

    <transition name="fade">
      <section v-if="isGameOver || isGameWon" class="raw-overlay">
        <div class="raw-box">
          <p class="raw-title">
            {{ isGameWon ? '== SUCCESS ==' : '== SYSTEM FAILURE ==' }}
          </p>
          <p class="raw-desc">
            {{ isGameWon ? 'All protocols executed successfully.' : 'Life support systems offline.' }}
          </p>
          <button class="reboot-btn" @click="restart">[ REBOOT SYSTEM ]</button>
        </div>
      </section>
    </transition>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { createInitialState, storyData, type StoryOption } from './story-data'

type ViewMode = 'chapter' | 'novel'

interface CompletedChapter {
  key: string
  index: number
  id: string
  text: string
  choiceText: string
}

const state = reactive(createInitialState())
const currentId = ref('start')
const logs = ref<string[]>([])
const displayedText = ref('')
const isTyping = ref(false)
const viewMode = ref<ViewMode>('chapter')
const selectedOption = ref<StoryOption | null>(null)
const selectedOptionKey = ref<string | null>(null)
const completedChapters = ref<CompletedChapter[]>([])
const mainContentRef = ref<HTMLElement | null>(null)
let typingTimer: any = null

const currentNode = computed(() => storyData.get(currentId.value)!)
const inventoryText = computed(() => state.inventory.join(', ') || 'NONE')
const isGameOver = computed(() => state.hp <= 0)
const isGameWon = computed(() => !!state.flags.gameFinished)
const currentChapterIndex = computed(() => completedChapters.value.length + 1)
const getOptionKey = (opt: StoryOption, index: number) => `${currentId.value}:${index}:${opt.nextId}:${opt.text}`
const isSelectedOption = (opt: StoryOption, index: number) => selectedOptionKey.value === getOptionKey(opt, index)

const scrollMainContentToBottom = async () => {
  await nextTick()
  requestAnimationFrame(() => {
    const mainContent = mainContentRef.value
    if (!mainContent) return
    mainContent.scrollTo({
      top: mainContent.scrollHeight,
      behavior: 'smooth'
    })
  })
}

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
      scrollMainContentToBottom()
    }
  }, 50)
}

watch(currentId, () => startTyping(currentNode.value.text), {
  immediate: true
})

const selectOption = (opt: StoryOption, index: number) => {
  if (isTyping.value || !canChoose(opt)) return
  selectedOption.value = opt
  selectedOptionKey.value = getOptionKey(opt, index)
  scrollMainContentToBottom()
}

const confirmChoice = () => {
  if (!selectedOption.value) return
  const opt = selectedOption.value
  const fromNode = currentNode.value
  currentNode.value.onExit?.(state)
  opt.action?.(state)
  if (state.hp <= 0) return
  if (opt.nextId !== currentId.value) {
    completedChapters.value.push({
      key: `${fromNode.id}:${completedChapters.value.length}:${Date.now()}`,
      index: completedChapters.value.length + 1,
      id: fromNode.id,
      text: fromNode.text,
      choiceText: opt.text
    })
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
/* 全局 CSS 变量定义 */
:root {
  --bg: #121212;
  /* --white: #d4d4d4; e2e2e2*/
  --white: #e2e2e2;
  --dim: #c2c2c2;
  --border: #27272a;
}

* {
  /* font-family: serif; */
  font-family: 'Courier New', Courier, monospace;
  touch-action: manipulation;
}

html,
body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>

<style lang="less" scoped>
.term-raw {
  background-color: var(--bg);
  color: var(--white);
  height: 100vh;
}

.term-wrapper {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
  height: 100%;
}

.main-content {
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 40px;
  /* 隐藏滚动条但保持滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  padding: 0 20px 40px 20px;
}

/* Chrome, Safari and Opera */
.main-content::-webkit-scrollbar {
  display: none;
}

/* 状态栏 */
.term-status {
  display: flex;
  gap: 15px;
  font-size: 14px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 15px;
  color: var(--dim);
  margin-top: 20px;
  align-items: center;
}

.status-node {
  color: var(--white);
}
.status-lbl {
  color: var(--dim);
  margin-right: 4px;
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--border);
}
.mode-btn {
  min-height: 38px;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--border);
  color: var(--dim);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}
.mode-btn:last-child {
  border-right: 0;
}
.mode-btn.is-active {
  background: var(--white);
  color: var(--bg);
  font-weight: bold;
}

/* 剧情显示 */
.term-output {
  min-height: 100px;
}
.term-text {
  font-size: 16px;
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
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

.novel-flow {
  display: flex;
  flex-direction: column;
  gap: 34px;
}
.novel-chapter {
  border-left: 1px solid var(--border);
  padding-left: 18px;
}
.novel-chapter.is-current {
  border-left-color: var(--white);
}
.chapter-title {
  margin: 0 0 10px;
  color: var(--dim);
  font-size: 12px;
  letter-spacing: 0;
}
.chapter-choice {
  margin: 14px 0 0;
  color: var(--dim);
  font-size: 13px;
  line-height: 1.6;
}

/* 指令区 */
.term-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 0 0 0;
}

.term-input.is-blocked {
  display: none;
  pointer-events: none;
}

/* 选项样式 - 精简版 */
.term-cmd {
  display: flex;
  align-items: flex-start;
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

  .term-label {
    opacity: 1;
  }
}

.term-symbol {
  width: 24px;
  font-size: 18px;
  flex-shrink: 0;
  text-align: left;
  display: inline-flex;
  align-items: flex-start;
  justify-content: center;
  line-height: 1.1;
}

.term-label {
  flex-grow: 1;
  font-size: 15px;
  opacity: 0.85;
  padding-left: 4px;
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
