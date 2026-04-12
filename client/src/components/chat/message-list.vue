<template>
  <div class="chat-messages" ref="messagesContainerRef">
    <div v-for="(message, index) in messagesWithKey" :key="message.uniqueKey" :class="['message', message.role]">
      <div class="content">
        <div class="text">
          <div v-if="message.content" class="message-content" v-html="formatMessage(message.content)"></div>

          <div v-if="message.loading" class="loading-indicator">
            <a-spin size="small" />
            <span class="loading-text">{{ message.loadingText || '正在思考...' }}</span>
          </div>

          <div v-if="message.role === 'assistant' && message.content && !message.loading" class="message-actions">
            <a-tooltip title="复制">
              <a-button type="text" size="small" @click="handleCopy(message.content)">
                <template #icon><CopyOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="重新生成">
              <a-button type="text" size="small" @click="handleRegenerate(index)">
                <template #icon><ReloadOutlined /></template>
              </a-button>
            </a-tooltip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  loadingText?: string
}

interface Props {
  messages: ChatMessage[]
}

interface Emits {
  (e: 'copy', content: string): void
  (e: 'regenerate', index: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const messagesContainerRef = ref<HTMLDivElement | null>(null)

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true, // 关键：保持换行一致性
  highlight: function (str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch (__) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

const messagesWithKey = computed(() => {
  return props.messages.map((msg, index) => ({
    ...msg,
    uniqueKey: `${index}-${msg.content.length}`
  }))
})

const formatMessage = (content: string) => {
  if (!content) return ''
  try {
    // 预处理：处理可能存在的非法空格字符
    const preprocessed = content.replace(/\u00a0/g, ' ')
    return md.render(preprocessed)
  } catch (error) {
    return md.utils.escapeHtml(content)
  }
}

const scrollToBottom = () => {
  if (messagesContainerRef.value) {
    messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
  }
}

defineExpose({ scrollToBottom })

const handleCopy = (content: string) => emit('copy', content)
const handleRegenerate = (index: number) => emit('regenerate', index)
</script>

<style scoped lang="less">
.message {
  display: flex;
  gap: 12px;
  max-width: 100%;
  // margin-bottom: 20px;
  // animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message.assistant {
  flex-direction: row;
}
.content {
  flex: 1;
  min-width: 0;
  max-width: 100%;
}
.message.user .content {
  display: flex;
  justify-content: flex-end;
}
.text {
  position: relative;
}

.message-content {
  border-radius: 8px;
  line-height: 1.75;
  font-size: 15px;

  word-break: break-word;
  padding: 12px 12px;
  // box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-content {
  /* 解决 Markdown 内部元素间距问题 */
  :deep(> *:first-child) {
    margin-top: 0 !important;
  }
  :deep(> *:last-child) {
    margin-bottom: 0 !important;
  }

  // 1. 段落控制：紧凑排版
  :deep(p) {
    margin-bottom: 0.8em;
    &:last-child {
      margin-bottom: 0;
    }
  }

  // 2. 标题控制：加重视觉重心
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    margin: 1.2em 0 0.6em;
    font-weight: 700;
    line-height: 1.3;
    color: #1a1a1a;
  }
  :deep(h3) {
    font-size: 1.25em;
  }

  // 3. 列表控制：针对你提供的“多层级”内容优化
  :deep(ul),
  :deep(ol) {
    margin: 0.4em 0 0.8em 1.2em;
    padding: 0;

    li {
      margin: 0.3em 0;
      // 处理列表内的段落，消除多余间距
      p {
        margin: 0;
      }
    }
  }

  // 4. 粗体强化：突出“核心本质”等关键词
  :deep(strong) {
    font-weight: 600;
    color: #000;
    margin: 0 1px;
  }

  // 5. 引用块样式
  :deep(blockquote) {
    margin: 1em 0;
    padding: 0.4em 1em;
    color: #555;
    background-color: rgba(0, 0, 0, 0.03);
    border-left: 4px solid #ddd;
    border-radius: 2px;
  }

  // 6. 代码块与行内代码
  :deep(pre.hljs) {
    margin: 1em 0;
    padding: 14px;
    border-radius: 8px;
    background: #282c34;
    code {
      white-space: pre;
      font-family: 'Fira Code', 'Monaco', monospace;
      font-size: 14px;
    }
  }

  :deep(code:not(pre code)) {
    background: rgba(175, 184, 193, 0.2);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9em;
    color: #e06c75;
  }
}

.message.user .message-content {
  background: #1890ff;
  color: white;
  border-top-right-radius: 4px;
}

.message.assistant .message-content {
  // background: #f5f5f5;
  color: #262626;
  border-top-left-radius: 4px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  border-top-left-radius: 4px;
  color: #8c8c8c;
}

.message-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  padding-left: 10px;
  .message:hover & {
    opacity: 1;
  }
}
</style>
