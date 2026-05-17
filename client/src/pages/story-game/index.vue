<template>
  <main class="term-raw">
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
              <span class="term-cursor" :class="{ 'is-typing': isTyping }">_</span>
            </p>
          </template>

          <!-- novel 模式 -->
          <article v-else class="novel-flow">
            <!-- 当前章节 -->
            <section class="novel-chapter is-current">
              <p class="chapter-title">No.{{ currentChapterIndex }}</p>

              <p class="term-text">
                {{ displayedText }}
                <span class="term-cursor" :class="{ 'is-typing': isTyping }">_</span>
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
            <!-- <span v-if="!canChoose(option)" class="term-badge">[LOCKED]</span> -->
          </div>

          <transition name="fade">
            <div v-if="selectedOption && !isTyping" class="confirm-area">
              <button class="execute-btn" @click="confirmChoice">确认选择</button>
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
const viewMode = ref<ViewMode>('novel')
const selectedOption = ref<StoryOption | null>(null)
const selectedOptionKey = ref<string | null>(null)
const completedChapters = ref<CompletedChapter[]>([])
const mainContentRef = ref<HTMLElement | null>(null)
let typingTimer: any = null

const currentNode = computed(() => storyData.get(currentId.value)!) // 获取当前剧情节点数据
const inventoryText = computed(() => state.inventory.join(', ') || 'NONE') // 将背包物品数组转换为显示文本，为空时显示'NONE'
const isGameOver = computed(() => state.hp <= 0) // 判断游戏是否结束（生命值小于等于0）
const isGameWon = computed(() => !!state.flags.gameFinished) // 判断游戏是否胜利（完成标志位是否为true）
const currentChapterIndex = computed(() => completedChapters.value.length + 1) // 计算当前章节序号（已完成章节数+1）

/**
 * 生成选项的唯一标识键
 * @param opt - 故事选项对象
 * @param index - 选项在列表中的索引
 * @returns 唯一标识字符串，格式为"当前节点ID:索引:下一节点ID:选项文本"
 */
const getOptionKey = (opt: StoryOption, index: number) => `${currentId.value}:${index}:${opt.nextId}:${opt.text}`

/**
 * 判断指定选项是否被选中
 * @param opt - 故事选项对象
 * @param index - 选项在列表中的索引
 * @returns 是否为当前选中的选项
 */
const isSelectedOption = (opt: StoryOption, index: number) => selectedOptionKey.value === getOptionKey(opt, index)

/**
 * 将主内容区域滚动到底部
 * 仅在chapter模式下执行滚动，novel模式不自动滚动
 */
const scrollMainContentToBottom = async () => {
  // novel 模式不自动滚动
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

/**
 * 开始打字机效果显示文本
 * @param text - 需要显示的文本内容
 */
const startTyping = (text: string) => {
  if (typingTimer) clearInterval(typingTimer) // 清除之前的定时器
  displayedText.value = '' // 清空已显示文本
  isTyping.value = true // 标记正在打字
  selectedOption.value = null // 重置选中选项
  selectedOptionKey.value = null // 重置选中选项的key

  let i = 0
  typingTimer = setInterval(() => {
    if (i < text.length) {
      displayedText.value += text.charAt(i) // 逐字添加文本
      i++
    } else {
      clearInterval(typingTimer) // 打字完成，清除定时器
      isTyping.value = false // 标记打字完成
      scrollMainContentToBottom() // 滚动到底部
    }
  }, 50) // 每50ms显示一个字符
}

// 监听当前节点变化，当节点切换时自动开始打字效果显示新文本
watch(currentId, () => startTyping(currentNode.value.text), {
  immediate: true
})

/**
 * 选择一个选项
 * @param opt - 被选择的故事选项
 * @param index - 选项在列表中的索引
 */
const selectOption = (opt: StoryOption, index: number) => {
  if (isTyping.value || !canChoose(opt)) return // 如果正在打字或选项不可选，则直接返回
  selectedOption.value = opt // 设置选中的选项
  selectedOptionKey.value = getOptionKey(opt, index) // 设置选中选项的key
  scrollMainContentToBottom() // 滚动到底部
}

/**
 * 确认选择的选项并执行相应操作
 * 处理状态更新、章节记录、节点跳转等逻辑
 */
const confirmChoice = () => {
  if (!selectedOption.value) return // 如果没有选中选项，直接返回

  const opt = selectedOption.value
  const fromNode = currentNode.value

  currentNode.value.onExit?.(state) // 执行当前节点的退出回调（如果存在）
  opt.action?.(state) // 执行选项的动作回调（如果存在），可能修改游戏状态

  if (state.hp <= 0) return // 如果生命值归零，不再继续

  // 如果跳转到不同节点，记录当前章节到历史
  if (opt.nextId !== currentId.value) {
    completedChapters.value.push({
      key: `${fromNode.id}:${completedChapters.value.length}:${Date.now()}`, // 生成唯一key
      index: completedChapters.value.length + 1, // 章节序号
      id: fromNode.id, // 节点ID
      text: fromNode.text, // 节点文本
      choiceText: opt.text // 选择的选项文本
    })
    currentId.value = opt.nextId // 切换到下一个节点
    currentNode.value.onEnter?.(state) // 执行新节点的进入回调（如果存在）
  } else {
    // 如果是同一节点（刷新状态），重置选择
    selectedOption.value = null
    selectedOptionKey.value = null
    log('指令已处理') // 记录日志
  }
}

/**
 * 判断选项是否可选
 * @param opt - 故事选项
 * @returns 如果选项没有条件或条件满足则返回true
 */
const canChoose = (opt: StoryOption) => !opt.condition || opt.condition(state)

/**
 * 添加系统日志
 * @param msg - 日志消息内容
 */
const log = (msg: string) => {
  logs.value.unshift(msg) // 在日志开头添加新消息
  logs.value = logs.value.slice(0, 3) // 只保留最近3条日志
}

/**
 * 重启游戏（重新加载页面）
 */
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
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
}
.term-cursor {
  // display: none;
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
  padding: 6px 20px;
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
