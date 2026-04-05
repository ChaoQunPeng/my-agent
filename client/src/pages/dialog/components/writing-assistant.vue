<template>
  <div class="writing-assistant">
    <div class="assistant-header">
      <a-tabs v-model:activeKey="activeTab" class="assistant-tabs">
        <a-tab-pane key="current" tab="当前章节" />
        <a-tab-pane key="basic" tab="基础设定" />
      </a-tabs>
    </div>

    <div class="assistant-content">
      <!-- 基础资料 Tab -->
      <div v-show="activeTab === 'basic'" class="tab-content">
        <!-- 基础信息 -->
        <div class="config-section">
          <div class="section-title">基础信息</div>

          <!-- <div class="field-item">
            <label class="field-label"> 小说编码</label>
            <a-input v-model:value="formData.novelCode" placeholder="" class="field-input" :disabled="true" />
            <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('novelCode')"> 保存 </a-button>
          </div> -->

          <div class="field-item">
            <label class="field-label">简介</label>
            <a-textarea v-model:value="formData.synopsis" :rows="3" placeholder="故事简介,100字左右" class="field-input" />
            <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('synopsis')"> 保存 </a-button>
          </div>
        </div>

        <!-- 世界观 -->
        <div class="config-section">
          <div class="section-title">世界观</div>

          <div class="field-item">
            <label class="field-label">时代背景</label>
            <a-textarea v-model:value="formData.worldBackground" :rows="2" placeholder="如修仙、科幻、现代" class="field-input" />
            <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('worldBackground')"> 保存 </a-button>
          </div>

          <div class="field-item">
            <label class="field-label">力量/逻辑规则</label>
            <a-textarea v-model:value="formData.worldLogicRules" :rows="2" placeholder="如灵气等级、魔法代价" class="field-input" />
            <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('worldLogicRules')"> 保存 </a-button>
          </div>

          <div class="field-item">
            <label class="field-label">势力/地理分布</label>
            <a-textarea v-model:value="formData.worldGeography" :rows="2" placeholder="地图或宗门分布" class="field-input" />
            <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('worldGeography')"> 保存 </a-button>
          </div>
        </div>

        <!-- 粗纲 -->
        <div class="config-section">
          <div class="section-title">粗纲</div>

          <div class="field-item">
            <a-textarea v-model:value="formData.mainOutline" :rows="4" placeholder="故事从起因到结局的主脉络" class="field-input" />
            <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('mainOutline')"> 保存 </a-button>
          </div>
        </div>

        <!-- 角色设定 -->
        <div class="config-section">
          <div class="section-title">
            角色设定
            <a-button type="link" size="small" @click="addCharacter">
              <template #icon><PlusOutlined /></template>
              添加角色
            </a-button>
          </div>

          <div v-for="(char, index) in formData.charactersList" :key="index" class="character-card">
            <div class="character-header">
              <span class="character-name">{{ char.name || `角色 ${index + 1}` }}</span>
              <a-button type="text" size="small" danger @click="removeCharacter(index)">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>

            <div class="field-item">
              <label class="field-label">姓名</label>
              <a-input v-model:value="char.name" placeholder="角色姓名" />
            </div>

            <div class="field-item">
              <label class="field-label">身份</label>
              <a-input v-model:value="char.identity" placeholder="如落魄少年、隐世高手" />
            </div>

            <div class="field-item">
              <label class="field-label">性格</label>
              <a-input v-model:value="char.personality" placeholder="如腹黑、稳健、果断" />
            </div>

            <div class="field-item">
              <label class="field-label">核心动机</label>
              <a-input v-model:value="char.goals" placeholder="他最终想要达成什么" />
            </div>

            <div class="field-item">
              <label class="field-label">特征</label>
              <a-input v-model:value="char.traits" placeholder="外貌、特定口癖或标志性动作" />
            </div>

            <a-button type="primary" size="small" class="save-btn" @click="handleSaveCharacters"> 保存角色 </a-button>
          </div>

          <a-empty v-if="!formData.charactersList || formData.charactersList.length === 0" description="暂无角色" class="mt-16" />
        </div>

        <!-- 写作指令 -->
        <div class="config-section">
          <div class="section-title">写作指令</div>

          <div class="field-item">
            <label class="field-label">叙事人称 </label>
            <a-select v-model:value="formData.writingPerspective" class="field-input">
              <a-select-option value="第一人称">第一人称</a-select-option>
              <a-select-option value="第三人称有限视角">第三人称有限视角</a-select-option>
              <a-select-option value="第三人称上帝视角">第三人称上帝视角</a-select-option>
            </a-select>
            <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('writingPerspective')"> 保存 </a-button>
          </div>

          <div class="field-item">
            <label class="field-label">文风基调</label>
            <a-textarea v-model:value="formData.writingTone" :rows="2" placeholder="如幽默、沉重、干练" class="field-input" />
            <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('writingTone')"> 保存 </a-button>
          </div>

          <div class="field-item">
            <label class="field-label">单章建议生成字数</label>
            <a-input-number v-model:value="formData.targetWordCount" :min="500" :max="10000" :step="100" class="field-input" />
            <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('targetWordCount')"> 保存 </a-button>
          </div>
        </div>

        <!-- 禁止事项 -->
        <div class="config-section">
          <div class="section-title">禁止事项（选填）</div>

          <div class="field-item">
            <label class="field-label">避雷剧情</label>
            <a-textarea v-model:value="avoidPlotsText" :rows="2" placeholder="如：禁止绿帽&#10;禁止降智" class="field-input" />
            <a-button type="primary" size="small" class="save-btn" @click="handleSaveArrayField('avoidPlots')"> 保存 </a-button>
          </div>

          <div class="field-item">
            <label class="field-label">禁忌词/敏感词库</label>
            <a-textarea v-model:value="forbiddenWordsText" :rows="2" placeholder="禁忌词" class="field-input" />
            <a-button type="primary" size="small" class="save-btn" @click="handleSaveArrayField('forbiddenWords')"> 保存 </a-button>
          </div>

          <div class="field-item">
            <label class="field-label">逻辑红线</label>
            <a-textarea v-model:value="formData.logicRedlines" :rows="2" placeholder="绝对禁止发生的逻辑错误" class="field-input" />
            <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('logicRedlines')"> 保存 </a-button>
          </div>
        </div>
      </div>

      <!-- 当前会话 Tab -->
      <div v-show="activeTab === 'current'" class="tab-content">
        <div class="config-section">
          <div class="section-title">当前章节总结</div>

          <div class="field-item">
            <label class="field-label">章节摘要</label>
            <a-textarea
              v-model:value="chapterSummary"
              :rows="6"
              placeholder="点击生成总结按钮，基于当前会话的所有对话内容自动生成章节摘要..."
              class="field-input"
              disabled
            />
            <a-button type="primary" size="small" class="save-btn" @click="generateChapterSummary"> 生成总结 </a-button>
          </div>
        </div>

        <div class="config-section">
          <div class="section-title">完整章节预览</div>

          <div class="preview-content">
            <a-empty v-if="!generatedChapterContent" description="暂无生成的章节内容" />
            <div v-else class="chapter-preview">
              <div class="chapter-header">
                <h3>{{ formData.novelCode || '未命名章节' }}</h3>
                <div class="chapter-meta">
                  <span>字数:{{ chapterWordCount }}</span>
                  <span>生成时间:{{ generationTime }}</span>
                </div>
              </div>
              <div class="chapter-body">{{ generatedChapterContent }}</div>
            </div>
            <a-button v-if="sessionMessages && sessionMessages.length > 0" type="primary" class="mt-16" block @click="generateFullChapter">
              生成完整章节
            </a-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { message as antMessage } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { getNovelConfigByCode, createOrUpdateNovelConfig, type NovelConfig, type Character } from '@/api/novel-context'
import { getSessionDetail } from '@/api/session'

const props = defineProps<{
  sessionId: string
  sessionCategory?: string
  novelCode?: string
}>()

// Tab 激活状态
const activeTab = ref('current')

// 当前会话相关
const chapterSummary = ref('')
const sessionMessages = ref<Array<{ role: string; content: string }>>([])
const generatedChapterContent = ref('')
const generationTime = ref('')
const chapterWordCount = ref(0)

// 表单数据
const formData = ref<NovelConfig>({
  novelCode: props.novelCode || '',
  synopsis: '',
  worldBackground: '',
  worldLogicRules: '',
  worldGeography: '',
  mainOutline: '',
  writingTone: '通俗网文风格',
  charactersList: [],
  writingPerspective: '第三人称有限视角',
  targetWordCount: 2000,
  avoidPlots: [],
  forbiddenWords: [],
  logicRedlines: ''
})

// 用于文本域显示的数组字段（换行分隔）
const avoidPlotsText = ref('')
const forbiddenWordsText = ref('')

// 加载配置（基于 novelCode）
const loadConfig = async () => {
  if (!props.novelCode) {
    console.warn('novelCode 为空，无法加载配置')
    return
  }

  try {
    const res = await getNovelConfigByCode(props.novelCode)
    const config = res.data

    if (config) {
      formData.value = { ...formData.value, ...config }

      // 将数组转换为文本
      avoidPlotsText.value = (config.avoidPlots || []).join('\n')
      forbiddenWordsText.value = (config.forbiddenWords || []).join('\n')
    }

    // 加载会话消息
    await loadSessionMessages()
  } catch (error) {
    console.error('加载小说配置失败:', error)
  }
}

// 加载会话消息
const loadSessionMessages = async () => {
  try {
    const res = await getSessionDetail(props.sessionId)
    const { messages } = res.data

    sessionMessages.value = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }))
  } catch (error) {
    console.error('加载会话消息失败:', error)
  }
}

// 生成章节总结（基于当前会话的所有消息）
const generateChapterSummary = async () => {
  if (!sessionMessages.value || sessionMessages.value.length === 0) {
    antMessage.warning('当前会话暂无对话内容')
    return
  }

  try {
    // 提取所有用户消息作为上下文
    const userMessages = sessionMessages.value.filter(msg => msg.role === 'user').map(msg => msg.content)

    // 提取所有 AI 回复
    const assistantMessages = sessionMessages.value.filter(msg => msg.role === 'assistant').map(msg => msg.content)

    // TODO: 调用 AI 接口生成智能总结
    // 这里暂时使用简单的拼接逻辑，后续可以接入大模型 API
    const summary = `本章节共 ${sessionMessages.value.length} 条对话：
- 用户消息：${userMessages.length} 条
- AI 回复：${assistantMessages.length} 条

核心内容摘要：
${userMessages.slice(0, 3).join('\n\n---\n\n')}

关键情节发展：
${assistantMessages.slice(0, 2).join('\n\n---\n\n')}`

    chapterSummary.value = summary

    antMessage.success('章节总结生成成功')
  } catch (error) {
    console.error('生成章节总结失败:', error)
    antMessage.error('生成章节总结失败')
  }
}

// 保存单个字段
const handleSaveField = async (field: keyof NovelConfig) => {
  // 验证 novelCode
  if (!formData.value.novelCode || !formData.value.novelCode.trim()) {
    antMessage.error('请先填写并保存小说编码')
    return
  }

  try {
    await createOrUpdateNovelConfig(formData.value)
    antMessage.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    antMessage.error('保存失败')
  }
}

// 保存数组字段（从文本转换为数组）
const handleSaveArrayField = async (field: 'avoidPlots' | 'forbiddenWords') => {
  try {
    const text = field === 'avoidPlots' ? avoidPlotsText.value : forbiddenWordsText.value
    const array = text.split('\n').filter(item => item.trim())

    await createOrUpdateNovelConfig({
      ...formData.value,
      [field]: array
    })
    antMessage.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    antMessage.error('保存失败')
  }
}

// 添加角色
const addCharacter = () => {
  if (!formData.value.charactersList) {
    formData.value.charactersList = []
  }
  formData.value.charactersList.push({
    name: '',
    identity: '',
    personality: '',
    goals: '',
    traits: ''
  })
}

// 删除角色
const removeCharacter = (index: number) => {
  if (formData.value.charactersList) {
    formData.value.charactersList.splice(index, 1)
  }
}

// 保存角色
const handleSaveCharacters = async () => {
  try {
    await createOrUpdateNovelConfig(formData.value)
    antMessage.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    antMessage.error('保存失败')
  }
}

// 生成完整章节内容
const generateFullChapter = async () => {
  if (!sessionMessages.value || sessionMessages.value.length === 0) {
    antMessage.warning('当前会话暂无对话内容')
    return
  }

  try {
    // TODO: 调用 AI 接口生成完整的小说章节
    // 这里暂时使用简单的拼接逻辑，后续接入大模型 API

    // 提取所有用户提示和 AI 回复，组织成连贯的章节
    const chapterParts: string[] = []

    sessionMessages.value.forEach((msg, index) => {
      if (msg.role === 'assistant' && msg.content.trim()) {
        // 清理 AI 回复中的标记性文字
        let content = msg.content
          .replace(/^(好的|让我|我来|以下是|根据)/g, '')
          .replace(/^[:：]\s*/g, '')
          .trim()

        if (content) {
          chapterParts.push(content)
        }
      }
    })

    // 如果没有 AI 回复，尝试从用户消息中提取
    if (chapterParts.length === 0) {
      const userContents = sessionMessages.value.filter(msg => msg.role === 'user').map(msg => msg.content)

      generatedChapterContent.value = `【基于对话内容生成的章节草稿】\n\n${userContents.join('\n\n')}`
    } else {
      generatedChapterContent.value = chapterParts.join('\n\n')
    }

    // 计算字数（中文字符）
    chapterWordCount.value = generatedChapterContent.value.replace(/\s/g, '').length

    // 记录生成时间
    const now = new Date()
    generationTime.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    antMessage.success('完整章节生成成功')
  } catch (error) {
    console.error('生成完整章节失败:', error)
    antMessage.error('生成完整章节失败')
  }
}

// 监听 sessionId 和 novelCode 变化
watch(
  [() => props.sessionId, () => props.novelCode],
  ([newSessionId, newNovelCode]) => {
    formData.value.novelCode = newNovelCode || ''
    loadConfig()
  },
  { immediate: true }
)

onMounted(() => {
  loadConfig()
})
</script>

<style lang="less" scoped>
.writing-assistant {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;

  .assistant-header {
    padding: 0 16px;
    border-bottom: 1px solid #f0f0f0;

    .assistant-tabs {
      :deep(.ant-tabs-nav) {
        margin: 0;

        &::before {
          border-bottom: none;
        }
      }
    }
  }

  .assistant-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    padding: 16px;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background: #d9d9d9;
      border-radius: 3px;

      &:hover {
        background: #bfbfbf;
      }
    }
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .config-section {
    display: flex;
    flex-direction: column;

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #262626;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #f0f0f0;
      padding-bottom: 10px;
    }
  }

  .field-item {
    margin-bottom: 16px;

    .field-label {
      display: block;
      font-size: 13px;
      color: #262626;
      margin-bottom: 8px;
      font-weight: bold;

      .required {
        color: #ff4d4f;
        margin-left: 2px;
      }
    }

    .field-input {
      width: 100%;
    }

    .save-btn {
      margin-top: 10px;
      float: right;
      width: auto;
    }
  }

  .character-card {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;

    .character-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;

      .character-name {
        font-size: 13px;
        font-weight: 500;
        color: #262626;
      }
    }
  }

  .preview-content {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    padding: 16px;
    max-height: 600px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background: #d9d9d9;
      border-radius: 3px;
    }

    .chapter-preview {
      .chapter-header {
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 2px solid #e8e8e8;

        h3 {
          margin: 0 0 12px 0;
          font-size: 18px;
          font-weight: 600;
          color: #262626;
        }

        .chapter-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #8c8c8c;

          span {
            display: inline-flex;
            align-items: center;

            &::before {
              content: '•';
              margin-right: 8px;
              color: #d9d9d9;
            }
          }
        }
      }

      .chapter-body {
        font-size: 14px;
        line-height: 1.8;
        color: #262626;
        white-space: pre-wrap;
        word-break: break-word;
        text-align: justify;
      }
    }

    .message-list {
      .message-item {
        margin-bottom: 16px;
        padding: 12px;
        border-radius: 8px;

        &.user {
          background: #e6f7ff;
          margin-left: 40px;

          .message-role {
            color: #1890ff;
            text-align: right;
          }
        }

        &.assistant {
          background: #f6ffed;
          margin-right: 40px;

          .message-role {
            color: #52c41a;
          }
        }

        .message-role {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .message-content {
          font-size: 13px;
          line-height: 1.6;
          color: #262626;
          white-space: pre-wrap;
          word-break: break-word;
        }
      }
    }
  }

  .mt-16 {
    margin-top: 16px;
  }
}
</style>
