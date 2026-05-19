<template>
  <main class="term-raw" :class="[themeClass, fxClass]">
    <div class="term-wrapper">
      <section class="term-status">
        <span class="status-node"><span class="status-lbl">HP:</span> {{ state.hp }}</span>
        <span class="status-sep">|</span>
        <span class="status-node"><span class="status-lbl">GOLD:</span> {{ state.gold }}</span>
        <span class="status-sep">|</span>
        <span class="status-node"><span class="status-lbl">INV:</span> {{ inventoryText }}</span>

        <section class="mode-switch" aria-label="阅读模式">
          <button class="mode-btn" :class="{ 'is-active': viewMode === 'chapter' }" type="button" @click="viewMode = 'chapter'">
            单节
          </button>

          <span class="mode-divider">|</span>

          <button class="mode-btn" :class="{ 'is-active': viewMode === 'novel' }" type="button" @click="viewMode = 'novel'">长卷</button>
        </section>
      </section>

      <div ref="mainContentRef" class="main-content">
        <section class="term-output">
          <!-- chapter 模式 -->
          <template v-if="viewMode === 'chapter'">
            <p class="term-text">
              {{ displayedText }}

              <span class="term-cursor" :class="{ 'is-typing': isTyping }">
                {{ cursorSymbol }}
              </span>
            </p>
          </template>

          <!-- novel 模式 -->
          <article v-else class="novel-flow">
            <!-- 当前章节 -->
            <section class="novel-chapter is-current">
              <p class="chapter-title">No.{{ currentChapterIndex }}</p>

              <p class="term-text">
                {{ displayedText }}

                <span class="term-cursor" :class="{ 'is-typing': isTyping }">
                  {{ cursorSymbol }}
                </span>
              </p>

              <!-- novel 模式下，把输入区放这里 -->
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
                </div>

                <transition name="fade">
                  <div v-if="selectedOption && !isTyping" class="confirm-area">
                    <button class="execute-btn" @click="confirmChoice">确认选择</button>
                  </div>
                </transition>
              </section>
            </section>

            <!-- 历史章节 -->
            <section v-for="chapter in [...completedChapters].reverse()" :key="chapter.key" class="novel-chapter">
              <p class="chapter-title">No.{{ chapter.index }}</p>

              <p class="term-text">{{ chapter.text }}</p>

              <p v-if="chapter.choiceText" class="chapter-choice">你：{{ chapter.choiceText }}</p>
            </section>
          </article>
        </section>

        <section v-if="viewMode === 'chapter'" class="term-input" :class="{ 'is-blocked': isTyping }">
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
          </div>

          <transition name="fade">
            <div v-if="selectedOption && !isTyping" class="confirm-area">
              <button class="execute-btn" @click="confirmChoice">确认选择</button>
            </div>
          </transition>
        </section>
      </div>
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

type ThemeMode = 'horror' | 'romance' | 'slice'

type FxMode = 'grain' | 'scanline' | 'crt'

/**
 * 主题配置
 */
const THEME: ThemeMode = 'horror'

/**
 * FX 氛围效果
 *
 * grain     = 胶片颗粒
 * scanline  = 扫描线
 * crt       = CRT闪烁
 */
const FX: FxMode[] = ['scanline']

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

const viewMode = ref<ViewMode>('novel')

const selectedOption = ref<StoryOption | null>(null)

const selectedOptionKey = ref<string | null>(null)

const completedChapters = ref<CompletedChapter[]>([])

const mainContentRef = ref<HTMLElement | null>(null)

let typingTimer: any = null

const themeClass = computed(() => `theme-${THEME}`)

const fxClass = computed(() => FX.map(item => `fx-${item}`).join(' '))

const cursorSymbol = computed(() => {
  switch (THEME) {
    case 'romance':
      return '_'

    case 'slice':
      return '▋'

    default:
      return '_'
  }
})

const currentNode = computed(() => storyData.get(currentId.value)!)

const inventoryText = computed(() => state.inventory.join(', ') || 'NONE')

const isGameOver = computed(() => state.hp <= 0)

const isGameWon = computed(() => !!state.flags.gameFinished)

const currentChapterIndex = computed(() => completedChapters.value.length + 1)

const getOptionKey = (opt: StoryOption, index: number) => `${currentId.value}:${index}:${opt.nextId}:${opt.text}`

const isSelectedOption = (opt: StoryOption, index: number) => selectedOptionKey.value === getOptionKey(opt, index)

const scrollMainContentToBottom = async () => {
  if (viewMode.value === 'novel') return

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
:root {
  --bg: #121212;
  --white: #e2e2e2;
  --dim: #c2c2c2;
  --border: #27272a;

  --font: 'Courier New', Courier, monospace;
}

* {
  font-family: var(--font);
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
.theme-horror {
  --bg: #121212;
  --white: #e2e2e2;
  --dim: #9a9a9a;
  --border: #2a2a2a;

  --font: 'Courier New', Courier, monospace;
}

.theme-romance {
  --bg: #f6f2eb;
  --white: #5b5147;
  --dim: #9a8f84;
  --border: #ddd4c7;

  --font: 'PingFang SC', sans-serif;
}

.theme-slice {
  --bg: #f7f3ea;
  --white: #4e463f;
  --dim: #8f8578;
  --border: #ddd6c8;

  --font: 'Noto Serif SC', serif;
}

/* FX ====================== */

.fx-grain::before {
  content: '';

  position: absolute;
  inset: 0;

  pointer-events: none;

  opacity: 0.025;

  z-index: 1;

  background-image: radial-gradient(#000 0.5px, transparent 0.5px);

  background-size: 4px 4px;

  mix-blend-mode: multiply;
}

.fx-scanline::after {
  content: '';

  position: absolute;
  inset: 0;

  pointer-events: none;

  opacity: 0.06;

  z-index: 2;

  background: repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(255, 255, 255, 0.03) 3px);
}

.fx-crt {
  animation: crt-flicker 0.12s infinite;
}

@keyframes crt-flicker {
  0% {
    opacity: 0.985;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.99;
  }
}

/* ====================== */

.term-raw {
  background-color: var(--bg);
  color: var(--white);
  height: 100vh;

  transition:
    background-color 0.25s ease,
    color 0.25s ease;

  position: relative;
  overflow: hidden;
}

.term-wrapper {
  max-width: 680px;
  margin: 0 auto;

  display: flex;
  flex-direction: column;

  gap: 20px;

  overflow: hidden;

  height: 100%;

  position: relative;
  z-index: 5;
}

.main-content {
  overflow-x: hidden;
  overflow-y: auto;

  padding-bottom: 40px;

  scrollbar-width: none;
  -ms-overflow-style: none;

  padding: 0 20px 40px 20px;
}

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

  transition: border-color 0.25s ease;
}

.status-node {
  color: var(--white);
}

.status-lbl {
  color: var(--dim);
  margin-right: 4px;
}

.mode-switch {
  display: flex;
  align-items: center;

  gap: 10px;

  margin-left: auto;

  font-size: 12px;

  color: var(--dim);
}

.mode-btn {
  background: transparent;

  border: 0;

  padding: 0;

  color: var(--dim);

  font-family: inherit;

  font-size: inherit;

  cursor: pointer;

  transition:
    opacity 0.15s ease,
    color 0.15s ease;

  opacity: 0.5;
}

.mode-btn:hover {
  opacity: 0.8;
}

.mode-btn.is-active {
  color: var(--white);
  opacity: 1;
}

.mode-divider {
  opacity: 0.3;
}

/* 剧情显示 */
.term-output {
  min-height: 100px;
}

.term-text {
  font-size: 16px;

  line-height: 1.9;

  margin: 0;

  white-space: pre-wrap;

  letter-spacing: 0.02em;
}

.term-cursor {
  margin-left: 6px;

  animation: blink 0.8s steps(1) infinite;

  &.is-typing {
    display: inline-block;
  }
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

  transition: border-color 0.25s ease;
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

.term-cmd {
  display: flex;

  align-items: flex-start;

  padding: 10px 0;

  cursor: pointer;

  color: var(--dim);

  transition:
    opacity 0.15s ease,
    color 0.15s ease;
}

.term-cmd:hover {
  opacity: 0.75;
}

.term-cmd.is-selected {
  color: var(--white);

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

.term-cmd.is-locked {
  cursor: not-allowed;

  text-decoration: line-through;

  opacity: 0.45;
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

  padding: 6px 20px;

  font-family: inherit;

  font-size: 14px;

  letter-spacing: 1px;

  cursor: pointer;

  transition:
    opacity 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.execute-btn:hover {
  background: var(--white);

  color: var(--bg);
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

  transition:
    opacity 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.reboot-btn:hover {
  background: var(--white);

  color: var(--bg);
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
