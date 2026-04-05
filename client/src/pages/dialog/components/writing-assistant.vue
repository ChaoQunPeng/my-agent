<template>
  <div class="writing-assistant">
    <div class="assistant-header">
      <h3 class="title">小说配置</h3>
    </div>

    <div class="assistant-content">
      <!-- 基础信息 -->
      <div class="config-section">
        <div class="section-title">基础信息</div>

        <div class="field-item">
          <label class="field-label">简介</label>
          <a-textarea v-model:value="formData.synopsis" :rows="3" placeholder="一句话核心梗/冲突" class="field-input" />
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('synopsis')"> 保存 </a-button>
        </div>
      </div>

      <!-- 世界观 -->
      <div class="config-section">
        <div class="section-title">世界观</div>

        <div class="field-item">
          <label class="field-label">时代背景</label>
          <a-textarea v-model:value="formData.world_background" :rows="2" placeholder="如修仙、科幻、现代" class="field-input" />
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('world_background')"> 保存 </a-button>
        </div>

        <div class="field-item">
          <label class="field-label">力量/逻辑规则</label>
          <a-textarea v-model:value="formData.world_logic_rules" :rows="2" placeholder="如灵气等级、魔法代价" class="field-input" />
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('world_logic_rules')"> 保存 </a-button>
        </div>

        <div class="field-item">
          <label class="field-label">势力/地理分布</label>
          <a-textarea v-model:value="formData.world_geography" :rows="2" placeholder="地图或宗门分布" class="field-input" />
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('world_geography')"> 保存 </a-button>
        </div>
      </div>

      <!-- 粗纲 -->
      <div class="config-section">
        <div class="section-title">粗纲</div>

        <div class="field-item">
          <a-textarea v-model:value="formData.main_outline" :rows="4" placeholder="故事从起因到结局的主脉络" class="field-input" />
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('main_outline')"> 保存 </a-button>
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

        <div v-for="(char, index) in formData.characters_list" :key="index" class="character-card">
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

        <a-empty v-if="!formData.characters_list || formData.characters_list.length === 0" description="暂无角色" class="mt-16" />
      </div>

      <!-- 写作指令 -->
      <div class="config-section">
        <div class="section-title">写作指令</div>

        <div class="field-item">
          <label class="field-label">叙事人称 </label>
          <a-select v-model:value="formData.writing_perspective" class="field-input">
            <a-select-option value="第一人称">第一人称</a-select-option>
            <a-select-option value="第三人称有限视角">第三人称有限视角</a-select-option>
            <a-select-option value="第三人称上帝视角">第三人称上帝视角</a-select-option>
          </a-select>
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('writing_perspective')"> 保存 </a-button>
        </div>

        <div class="field-item">
          <label class="field-label">文风基调</label>
          <a-textarea v-model:value="formData.writing_tone" :rows="2" placeholder="如幽默、沉重、干练" class="field-input" />
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('writing_tone')"> 保存 </a-button>
        </div>

        <div class="field-item">
          <label class="field-label">单章建议生成字数</label>
          <a-input-number v-model:value="formData.target_word_count" :min="500" :max="10000" :step="100" class="field-input" />
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('target_word_count')"> 保存 </a-button>
        </div>
      </div>

      <!-- 禁止事项 -->
      <div class="config-section">
        <div class="section-title">禁止事项（选填）</div>

        <div class="field-item">
          <label class="field-label">避雷剧情</label>
          <a-textarea v-model:value="avoidPlotsText" :rows="2" placeholder="每行一个，如：禁止绿帽&#10;禁止降智" class="field-input" />
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveArrayField('avoid_plots')"> 保存 </a-button>
        </div>

        <div class="field-item">
          <label class="field-label">禁忌词/敏感词库</label>
          <a-textarea v-model:value="forbiddenWordsText" :rows="2" placeholder="每行一个禁忌词" class="field-input" />
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveArrayField('forbidden_words')"> 保存 </a-button>
        </div>

        <div class="field-item">
          <label class="field-label">逻辑红线</label>
          <a-textarea v-model:value="formData.logic_redlines" :rows="2" placeholder="绝对禁止发生的逻辑错误" class="field-input" />
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('logic_redlines')"> 保存 </a-button>
        </div>
      </div>

      <!-- 阶段性目标 -->
      <div class="config-section">
        <div class="section-title">阶段性目标（选填）</div>

        <div class="field-item">
          <label class="field-label">本卷核心任务</label>
          <a-textarea v-model:value="formData.volume_goal" :rows="2" placeholder="当前阶段要达到的高潮" class="field-input" />
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('volume_goal')"> 保存 </a-button>
        </div>

        <div class="field-item">
          <label class="field-label">本章具体目标</label>
          <a-textarea v-model:value="formData.chapter_goal" :rows="2" placeholder="这章必须写到的关键转折点" class="field-input" />
          <a-button type="primary" size="small" class="save-btn" @click="handleSaveField('chapter_goal')"> 保存 </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { message as antMessage } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { getNovelConfig, createOrUpdateNovelConfig, type NovelConfig, type Character } from '@/api/novel-context'

const props = defineProps<{
  sessionId: string
}>()

// 表单数据
const formData = ref<NovelConfig>({
  sessionId: props.sessionId,
  title: '',
  synopsis: '',
  world_background: '',
  world_logic_rules: '',
  world_geography: '',
  main_outline: '',
  writing_tone: '通俗网文风格',
  characters_list: [],
  writing_perspective: '第三人称有限视角',
  target_word_count: 2000,
  avoid_plots: [],
  forbidden_words: [],
  logic_redlines: '',
  volume_goal: '',
  chapter_goal: ''
})

// 用于文本域显示的数组字段（换行分隔）
const avoidPlotsText = ref('')
const forbiddenWordsText = ref('')

// 加载配置
const loadConfig = async () => {
  try {
    const config = await getNovelConfig(props.sessionId)
    if (config) {
      formData.value = { ...formData.value, ...config }

      // 将数组转换为文本
      avoidPlotsText.value = (config.avoid_plots || []).join('\n')
      forbiddenWordsText.value = (config.forbidden_words || []).join('\n')
    }
  } catch (error) {
    console.error('加载小说配置失败:', error)
  }
}

// 保存单个字段
const handleSaveField = async (field: keyof NovelConfig) => {
  try {
    await createOrUpdateNovelConfig({
      ...formData.value,
      sessionId: props.sessionId
    })
    antMessage.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    antMessage.error('保存失败')
  }
}

// 保存数组字段（从文本转换为数组）
const handleSaveArrayField = async (field: 'avoid_plots' | 'forbidden_words') => {
  try {
    const text = field === 'avoid_plots' ? avoidPlotsText.value : forbiddenWordsText.value
    const array = text.split('\n').filter(item => item.trim())

    await createOrUpdateNovelConfig({
      ...formData.value,
      [field]: array,
      sessionId: props.sessionId
    })
    antMessage.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    antMessage.error('保存失败')
  }
}

// 添加角色
const addCharacter = () => {
  if (!formData.value.characters_list) {
    formData.value.characters_list = []
  }
  formData.value.characters_list.push({
    name: '',
    identity: '',
    personality: '',
    goals: '',
    traits: ''
  })
}

// 删除角色
const removeCharacter = (index: number) => {
  formData.value.characters_list?.splice(index, 1)
}

// 保存角色
const handleSaveCharacters = async () => {
  try {
    await createOrUpdateNovelConfig({
      ...formData.value,
      sessionId: props.sessionId
    })
    antMessage.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    antMessage.error('保存失败')
  }
}

// 监听 sessionId 变化
watch(
  () => props.sessionId,
  () => {
    formData.value.sessionId = props.sessionId
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
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;

    .title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #262626;
    }
  }

  .assistant-content {
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

  .config-section {
    margin-bottom: 24px;

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #262626;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }

  .field-item {
    margin-bottom: 16px;

    .field-label {
      display: block;
      font-size: 13px;
      color: #595959;
      margin-bottom: 8px;
    }

    .field-input {
      width: 100%;
    }

    .save-btn {
      margin-top: 8px;
      width: 100%;
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

  .mt-16 {
    margin-top: 16px;
  }
}
</style>
