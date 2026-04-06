<template>
  <div class="character-selector">
    <!-- Tab切换 -->
    <div class="selector-header">
      <a-tabs v-model:activeKey="activeTab" class="selector-tabs">
        <a-tab-pane key="current" tab="当前会话" />
        <a-tab-pane key="manage" tab="人物管理" />
      </a-tabs>
    </div>

    <div class="selector-content">
      <!-- 人物管理 Tab -->
      <div v-show="activeTab === 'manage'" class="tab-content">
        <!-- 新建人物按钮 -->
        <div class="action-bar">
          <a-button type="primary" @click="handleCreateCharacter">
            <PlusOutlined />
            新建人物
          </a-button>
        </div>

        <!-- 人物列表 -->
        <div class="character-list">
          <div v-for="character in characters" :key="character.characterId" class="character-item" @click="handleEditCharacter(character)">
            <div class="character-info">
              <div class="character-name">{{ character.name }}</div>
              <div class="character-meta">
                <span class="gender-tag" :class="getGenderClass(character.gender)">
                  {{ getGenderText(character.gender) }}
                </span>
                <span class="age-text">{{ character.age }}岁</span>
                <span class="profession-text">{{ character.profession }}</span>
              </div>
            </div>
            <a-button type="text" size="small" @click.stop="handleDeleteCharacter(character.characterId)">
              <DeleteOutlined />
            </a-button>
          </div>

          <a-empty v-if="characters.length === 0" description="暂无人物" class="mt-24" />
        </div>
      </div>

      <!-- 当前会话 Tab -->
      <div v-show="activeTab === 'current'" class="tab-content">
        <!-- 如果已经绑定了人物，显示人物详情 -->
        <div v-if="boundCharacter" class="bound-character">
          <a-alert message="当前会话已绑定人物" description="您可以查看角色详情或解绑角色" type="info" show-icon class="mb-16" />

          <div class="character-detail">
            <div class="detail-item">
              <label>姓名：</label>
              <span>{{ boundCharacter.name }}</span>
            </div>
            <div class="detail-item">
              <label>性别：</label>
              <span>{{ getGenderText(boundCharacter.gender) }}</span>
            </div>
            <div class="detail-item">
              <label>年龄：</label>
              <span>{{ boundCharacter.age }}岁</span>
            </div>
            <div class="detail-item">
              <label>外貌：</label>
              <span>{{ boundCharacter.appearance || '未填写' }}</span>
            </div>
            <div class="detail-item">
              <label>职业：</label>
              <span>{{ boundCharacter.profession }}</span>
            </div>
            <div class="detail-item full-width">
              <label>性格概述：</label>
              <span>{{ boundCharacter.personalityOverview }}</span>
            </div>
            <div class="detail-item full-width">
              <label>性格标签：</label>
              <div class="tags-container">
                <a-tag v-for="tag in boundCharacter.personalityTags" :key="tag" color="blue">
                  {{ tag }}
                </a-tag>
              </div>
            </div>
            <div class="detail-item full-width">
              <label>行为描述：</label>
              <div class="behavior-list">
                <div v-for="(desc, index) in boundCharacter.behaviorDescriptions" :key="index" class="behavior-item">
                  {{ index + 1 }}. {{ desc }}
                </div>
                <span v-if="!boundCharacter.behaviorDescriptions || boundCharacter.behaviorDescriptions.length === 0"> 未填写 </span>
              </div>
            </div>
          </div>

          <!-- 解绑按钮 -->
          <div class="unbind-action">
            <a-button danger @click="handleUnbindCharacter">
              <DeleteOutlined />
              解绑角色
            </a-button>
          </div>
        </div>

        <!-- 如果未绑定人物，显示选择器 -->
        <div v-else class="bind-character">
          <a-select
            v-model:value="selectedCharacterId"
            placeholder="请选择人物"
            style="width: 100%; margin-bottom: 16px"
            show-search
            :filter-option="filterCharacterOption"
          >
            <a-select-option v-for="character in characters" :key="character.characterId" :value="character.characterId">
              <div class="select-option">
                <span class="option-name">{{ character.name }}</span>
                <span class="option-meta">
                  · {{ getGenderText(character.gender) }} · {{ character.age }}岁 · {{ character.profession }}
                </span>
              </div>
            </a-select-option>
          </a-select>

          <a-button type="primary" block :disabled="!selectedCharacterId" @click="handleBindCharacter"> 确定绑定 </a-button>
        </div>
      </div>
    </div>

    <!-- 编辑/新建人物对话框 -->
    <a-modal
      v-model:open="editModalVisible"
      :title="isEditMode ? '编辑人物' : '新建人物'"
      width="700px"
      @ok="handleSaveCharacter"
      @cancel="handleCancelEdit"
    >
      <a-form :model="editForm" layout="vertical" class="character-form">
        <!-- 姓名 -->
        <a-form-item label="姓名" required>
          <a-input v-model:value="editForm.name" placeholder="请输入真实姓名或代号" />
        </a-form-item>

        <!-- 性别和年龄 -->
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="性别" required>
              <a-select v-model:value="editForm.gender" placeholder="请选择性别">
                <a-select-option :value="0">未知</a-select-option>
                <a-select-option :value="1">男</a-select-option>
                <a-select-option :value="2">女</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="年龄" required>
              <a-input-number v-model:value="editForm.age" :min="1" :max="150" placeholder="请输入年龄" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 外貌 -->
        <a-form-item label="外貌">
          <a-textarea v-model:value="editForm.appearance" placeholder="侧重于神态和标志性特征" :rows="3" />
        </a-form-item>

        <!-- 职业 -->
        <a-form-item label="职业" required>
          <a-input v-model:value="editForm.profession" placeholder="描述职业对思维方式的影响，不要只是标签化" />
        </a-form-item>

        <!-- 性格概述 -->
        <a-form-item label="性格概述" required>
          <a-textarea v-model:value="editForm.personalityOverview" placeholder="描述矛盾点和内在驱动力" :rows="4" />
        </a-form-item>

        <!-- 性格标签 -->
        <a-form-item label="性格标签" required>
          <a-select
            v-model:value="editForm.personalityTags"
            mode="tags"
            placeholder="输入3-5个关键性格锚点，按回车添加"
            :max-tag-count="5"
          />
        </a-form-item>

        <!-- 行为描述 -->
        <a-form-item label="行为描述">
          <div class="behavior-input">
            <div v-for="(desc, index) in editForm.behaviorDescriptions || []" :key="index" class="behavior-item-input">
              <a-input v-model:value="editForm.behaviorDescriptions![index]" placeholder="描述解决问题的逻辑、应对压力的反应" />
              <a-button type="text" danger @click="removeBehaviorDescription(index)">
                <DeleteOutlined />
              </a-button>
            </div>
            <a-button type="dashed" block @click="addBehaviorDescription">
              <PlusOutlined />
              添加行为描述
            </a-button>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { message as antMessage, Modal } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import {
  getCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  bindCharacterToSession,
  unbindCharacterFromSession,
  getCharacterBySessionId,
  type Character
} from '@/api/character'

// Props
const props = defineProps<{
  sessionId: string
}>()

// Emits
const emit = defineEmits<{
  (e: 'characterBound', characterId: string): void
  (e: 'characterUnbound'): void
}>()

// 激活的Tab
const activeTab = ref('current')

// 人物列表
const characters = ref<Character[]>([])

// 当前会话绑定的人物
const boundCharacter = ref<Character | null>(null)

// 选中的人物ID（用于绑定）
const selectedCharacterId = ref<string>('')

// 编辑对话框
const editModalVisible = ref(false)
const isEditMode = ref(false)
const editForm = ref<Partial<Character>>({
  name: '',
  gender: 0,
  age: undefined,
  appearance: '',
  profession: '',
  personalityOverview: '',
  personalityTags: [],
  behaviorDescriptions: []
})

/**
 * 获取所有人物列表
 */
const fetchCharacters = async () => {
  try {
    const res = await getCharacters()
    characters.value = res.data || []
  } catch (error: any) {
    antMessage.error('获取人物列表失败')
  }
}

/**
 * 获取当前会话绑定的人物
 */
const fetchBoundCharacter = async () => {
  if (!props.sessionId) return

  try {
    const res = await getCharacterBySessionId(props.sessionId)
    boundCharacter.value = res.data
  } catch (error: any) {
    console.error('获取绑定人物失败', error)
  }
}

/**
 * 获取性别文本
 */
const getGenderText = (gender: number): string => {
  const genderMap: Record<number, string> = {
    0: '未知',
    1: '男',
    2: '女'
  }
  return genderMap[gender] || '未知'
}

/**
 * 获取性别样式类
 */
const getGenderClass = (gender: number): string => {
  const classMap: Record<number, string> = {
    0: 'gender-unknown',
    1: 'gender-male',
    2: 'gender-female'
  }
  return classMap[gender] || 'gender-unknown'
}

/**
 * 过滤人物选项（搜索功能）
 */
const filterCharacterOption = (input: string, option: any) => {
  const children = option.children?.default || []
  const text = children[0]?.children?.optionName || ''
  return text.toLowerCase().includes(input.toLowerCase())
}

/**
 * 新建人物
 */
const handleCreateCharacter = () => {
  isEditMode.value = false
  editForm.value = {
    name: '',
    gender: 0,
    age: undefined,
    appearance: '',
    profession: '',
    personalityOverview: '',
    personalityTags: [],
    behaviorDescriptions: []
  }
  editModalVisible.value = true
}

/**
 * 编辑人物
 */
const handleEditCharacter = (character: Character) => {
  isEditMode.value = true
  editForm.value = {
    ...character
  }
  editModalVisible.value = true
}

/**
 * 删除人物
 */
const handleDeleteCharacter = (characterId: string) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这个人物吗？删除后无法恢复。',
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        await deleteCharacter(characterId)
        await fetchCharacters()
        antMessage.success('人物删除成功')
      } catch (error: any) {
        antMessage.error('删除人物失败')
      }
    }
  })
}

/**
 * 保存人物（新建或更新）
 */
const handleSaveCharacter = async () => {
  // 验证必填字段
  if (!editForm.value.name?.trim()) {
    antMessage.warning('请输入姓名')
    return
  }
  if (editForm.value.gender === undefined || editForm.value.gender === null) {
    antMessage.warning('请选择性别')
    return
  }
  if (!editForm.value.age) {
    antMessage.warning('请输入年龄')
    return
  }
  if (!editForm.value.profession?.trim()) {
    antMessage.warning('请输入职业')
    return
  }
  if (!editForm.value.personalityOverview?.trim()) {
    antMessage.warning('请输入性格概述')
    return
  }
  if (!editForm.value.personalityTags || editForm.value.personalityTags.length === 0) {
    antMessage.warning('请至少添加一个性格标签')
    return
  }

  try {
    if (isEditMode.value && editForm.value.characterId) {
      // 更新人物
      await updateCharacter(editForm.value.characterId, editForm.value)
      antMessage.success('人物更新成功')
    } else {
      // 新建人物
      await createCharacter(editForm.value as any)
      antMessage.success('人物创建成功')
    }

    editModalVisible.value = false
    await fetchCharacters()
  } catch (error: any) {
    antMessage.error(isEditMode.value ? '更新人物失败' : '创建人物失败')
  }
}

/**
 * 取消编辑
 */
const handleCancelEdit = () => {
  editModalVisible.value = false
}

/**
 * 添加行为描述
 */
const addBehaviorDescription = () => {
  if (!editForm.value.behaviorDescriptions) {
    editForm.value.behaviorDescriptions = []
  }
  editForm.value.behaviorDescriptions.push('')
}

/**
 * 移除行为描述
 */
const removeBehaviorDescription = (index: number) => {
  editForm.value.behaviorDescriptions?.splice(index, 1)
}

/**
 * 绑定人物到当前会话
 */
const handleBindCharacter = async () => {
  if (!selectedCharacterId.value || !props.sessionId) {
    antMessage.warning('请选择人物')
    return
  }

  try {
    await bindCharacterToSession(selectedCharacterId.value, props.sessionId)
    antMessage.success('人物绑定成功')
    await fetchBoundCharacter()

    // 通知父组件角色已绑定
    emit('characterBound', selectedCharacterId.value)

    selectedCharacterId.value = ''
  } catch (error: any) {
    antMessage.error('绑定人物失败')
  }
}

/**
 * 解绑当前会话的人物
 */
const handleUnbindCharacter = async () => {
  if (!boundCharacter.value || !props.sessionId) {
    return
  }

  Modal.confirm({
    title: '确认解绑',
    content: `确定要解绑角色「${boundCharacter.value.name}」吗？`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        await unbindCharacterFromSession(boundCharacter.value!.characterId, props.sessionId)
        antMessage.success('解绑成功')

        // 重新获取绑定状态
        await fetchBoundCharacter()

        // 通知父组件角色已解绑
        emit('characterUnbound')
      } catch (error: any) {
        antMessage.error('解绑失败')
      }
    }
  })
}

// 监听sessionId变化，重新获取绑定的人物
watch(
  () => props.sessionId,
  () => {
    fetchBoundCharacter()
  }
)

// 组件挂载时获取数据
onMounted(() => {
  fetchCharacters()
  fetchBoundCharacter()
})
</script>

<style lang="less" scoped>
.character-selector {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;

  .selector-header {
    padding: 0 16px;
    border-bottom: 1px solid #f0f0f0;

    .selector-tabs {
      :deep(.ant-tabs-nav) {
        margin: 0;

        &::before {
          border-bottom: none;
        }
      }
    }
  }

  .selector-content {
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

    .action-bar {
      margin-bottom: 16px;
    }

    .character-list {
      .character-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        margin-bottom: 8px;
        border: 1px solid #f0f0f0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          background: #e6f7ff;
          border-color: #91d5ff;
        }

        .character-info {
          flex: 1;
          min-width: 0;

          .character-name {
            font-size: 14px;
            font-weight: 500;
            color: #262626;
            margin-bottom: 4px;
          }

          .character-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: #8c8c8c;

            .gender-tag {
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 11px;

              &.gender-male {
                background: #e6f7ff;
                color: #1890ff;
              }

              &.gender-female {
                background: #fff0f6;
                color: #eb2f96;
              }

              &.gender-unknown {
                background: #f5f5f5;
                color: #8c8c8c;
              }
            }

            .age-text {
              white-space: nowrap;
            }

            .profession-text {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
      }
    }

    .bound-character {
      .character-detail {
        .detail-item {
          display: flex;
          margin-bottom: 12px;
          font-size: 14px;

          label {
            min-width: 80px;
            font-weight: 500;
            color: #595959;
          }

          span {
            flex: 1;
            color: #262626;
          }

          &.full-width {
            flex-direction: column;

            label {
              margin-bottom: 4px;
            }

            .tags-container {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }

            .behavior-list {
              .behavior-item {
                margin-bottom: 8px;
                line-height: 1.6;
              }
            }
          }
        }
      }

      .unbind-action {
        display: flex;
        justify-content: flex-end;
      }
    }

    .bind-character {
      .select-option {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .option-name {
          font-weight: 500;
        }

        .option-meta {
          font-size: 12px;
          color: #8c8c8c;
        }
      }
    }
  }

  .character-form {
    .behavior-input {
      .behavior-item-input {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
    }
  }
}
</style>
