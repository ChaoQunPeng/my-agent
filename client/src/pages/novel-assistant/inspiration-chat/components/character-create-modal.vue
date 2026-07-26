<template>
  <a-drawer :open="open" :title="isEditing ? '编辑人物' : '新建人物'" width="min(920px, 100vw)" @close="handleClose">
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" class="character-form">
      <div class="form-section">
        <h3>基本信息</h3>
        <a-row :gutter="16">
          <a-col :xs="24" :md="10">
            <a-form-item label="姓名" name="name">
              <a-input v-model:value="form.name" placeholder="人物姓名" />
            </a-form-item>
          </a-col>
          <a-col :xs="12" :md="7">
            <a-form-item label="性别" name="gender">
              <a-select v-model:value="form.gender">
                <a-select-option value="未知">未知</a-select-option>
                <a-select-option value="男">男</a-select-option>
                <a-select-option value="女">女</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="12" :md="7">
            <a-form-item label="年龄" name="age">
              <a-input-number v-model:value="form.age" :min="0" :precision="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="别名">
          <a-select
            v-model:value="form.alias"
            mode="tags"
            :open="false"
            :token-separators="[',', '，']"
            placeholder="输入后按回车"
          />
        </a-form-item>
        <a-form-item label="简介">
          <a-textarea v-model:value="form.description" :rows="2" placeholder="人物简介" />
        </a-form-item>
      </div>

      <div class="form-section">
        <h3>人物设定</h3>
        <a-form-item label="外貌特征">
          <a-select
            v-model:value="form.appearance"
            mode="tags"
            :open="false"
            :token-separators="[',', '，']"
            placeholder="输入后按回车"
          />
        </a-form-item>
        <a-form-item label="性格特点">
          <a-select
            v-model:value="form.personality"
            mode="tags"
            :open="false"
            :token-separators="[',', '，']"
            placeholder="输入后按回车"
          />
        </a-form-item>
        <a-form-item label="过去经历">
          <a-textarea v-model:value="form.background" :rows="3" placeholder="请输入" />
        </a-form-item>
        <a-form-item label="核心目标">
          <a-select
            v-model:value="form.motivation"
            mode="tags"
            :open="false"
            :token-separators="[',', '，']"
            placeholder="输入后按回车"
          />
        </a-form-item>
      </div>

      <div class="form-section">
        <div class="section-heading">
          <h3>人物关系</h3>
          <a-button type="text" size="small" @click="addRelation"> <PlusOutlined />添加 </a-button>
        </div>
        <div v-for="(item, index) in form.relations" :key="`relation-${index}`" class="relation-row">
          <div class="relation-expression">
            <span class="relation-subject" :title="form.name.trim() || '当前人物'">
              {{ form.name.trim() || '当前人物' }}
            </span>
            <span class="relation-connector">与</span>
            <a-select v-model:value="item.targetId" placeholder="关联人物" show-search option-filter-prop="label">
              <a-select-option
                v-for="character in characters"
                :key="character.id"
                :value="character.id"
                :label="character.name"
              >
                {{ character.name }}
              </a-select-option>
            </a-select>
            <span class="relation-connector">是</span>
            <a-input v-model:value="item.relation" placeholder="关系" />
          </div>
          <a-input v-model:value="item.description" class="relation-description" placeholder="说明" />
          <a-tooltip title="删除关系">
            <a-button type="text" danger aria-label="删除人物关系" @click="form.relations.splice(index, 1)">
              <DeleteOutlined />
            </a-button>
          </a-tooltip>
        </div>
        <a-empty v-if="form.relations.length === 0" description="暂无人物关系" :image="simpleImage" />
      </div>

      <div class="form-section">
        <div class="section-heading">
          <h3>组织关系</h3>
          <a-button type="text" size="small" @click="addOrganizationRelation"> <PlusOutlined />添加 </a-button>
        </div>
        <div v-for="(item, index) in form.organizationRelations" :key="`organization-${index}`" class="relation-row">
          <div class="relation-expression">
            <span class="relation-subject" :title="form.name.trim() || '当前人物'">
              {{ form.name.trim() || '当前人物' }}
            </span>
            <span class="relation-connector">与</span>
            <a-select v-model:value="item.targetId" placeholder="关联组织" show-search option-filter-prop="label">
              <a-select-option
                v-for="organization in organizations"
                :key="organization.id"
                :value="organization.id"
                :label="organization.name"
              >
                {{ organization.name }}
              </a-select-option>
            </a-select>
            <span class="relation-connector">是</span>
            <a-input v-model:value="item.relation" placeholder="关系描述" />
            <span class="relation-connector">关系</span>
          </div>
          <a-input v-model:value="item.description" class="relation-description" placeholder="说明" />
          <a-tooltip title="删除关系">
            <a-button type="text" danger aria-label="删除组织关系" @click="form.organizationRelations.splice(index, 1)">
              <DeleteOutlined />
            </a-button>
          </a-tooltip>
        </div>
        <a-empty v-if="form.organizationRelations.length === 0" description="暂无组织关系" :image="simpleImage" />
      </div>

      <a-form-item label="备注">
        <a-textarea v-model:value="form.remark" :rows="2" />
      </a-form-item>
    </a-form>
    <template #footer>
      <div class="drawer-footer">
        <a-button @click="handleClose">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSubmit">
          {{ isEditing ? '保存' : '创建' }}
        </a-button>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue'
import type { CreateNovelCharacterPayload, NovelCharacter, NovelRelation } from '@/api/novel'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { Empty, message as antMessage } from 'ant-design-vue'
import { useNovelAssistantStore } from '@/stores/novel-assistant'

const props = defineProps<{
  open: boolean
  character?: NovelCharacter | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

type EditableNovelRelation = Omit<NovelRelation, 'targetId'> & {
  targetId: string | undefined
}

type CharacterFormState = Omit<CreateNovelCharacterPayload, 'novelId' | 'relations' | 'organizationRelations'> & {
  relations: EditableNovelRelation[]
  organizationRelations: EditableNovelRelation[]
}

const store = useNovelAssistantStore()
const { characters, organizations, selectedNovelId } = storeToRefs(store)
const formRef = ref<FormInstance>()
const saving = ref(false)
const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const isEditing = computed(() => Boolean(props.character))

const createDefaultForm = (): CharacterFormState => ({
  name: '',
  alias: [],
  gender: '未知',
  age: 0,
  description: '',
  appearance: [],
  personality: [],
  background: '',
  motivation: [],
  relations: [],
  organizationRelations: [],
  remark: ''
})

const form = reactive<CharacterFormState>(createDefaultForm())
const rules = {
  name: [{ required: true, whitespace: true, message: '请输入人物姓名' }],
  gender: [{ required: true, message: '请选择性别' }],
  age: [
    {
      type: 'number' as const,
      min: 0,
      message: '请输入有效年龄'
    }
  ]
}

const addRelation = () => {
  form.relations.push({ targetId: undefined, relation: '', description: '' })
}

const addOrganizationRelation = () => {
  form.organizationRelations.push({
    targetId: undefined,
    relation: '',
    description: ''
  })
}

const normalizeTags = (items: string[]) => items.map((item) => item.trim()).filter(Boolean)

const normalizeRelations = (items: EditableNovelRelation[]) =>
  items.map((item) => ({
    targetId: item.targetId?.trim() || '',
    relation: item.relation.trim(),
    description: item.description.trim()
  }))

const validateRelations = (items: EditableNovelRelation[]) =>
  items.every((item) => item.targetId?.trim() && item.relation.trim())

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    if (!selectedNovelId.value) {
      antMessage.warning('请先选择小说')
      return
    }
    if (!validateRelations(form.relations) || !validateRelations(form.organizationRelations)) {
      antMessage.warning('请完整填写关系对象和关系名称')
      return
    }

    saving.value = true
    // 新建和编辑共用同一份清理后的表单数据。
    const normalizedForm: Omit<CreateNovelCharacterPayload, 'novelId'> = {
      ...form,
      name: form.name.trim(),
      alias: normalizeTags(form.alias),
      appearance: normalizeTags(form.appearance),
      personality: normalizeTags(form.personality),
      motivation: normalizeTags(form.motivation),
      relations: normalizeRelations(form.relations),
      organizationRelations: normalizeRelations(form.organizationRelations)
    }

    if (props.character) {
      await store.updateCharacter({
        id: props.character.id,
        ...normalizedForm
      })
    } else {
      await store.addCharacter({
        ...normalizedForm,
        novelId: selectedNovelId.value
      })
    }
    antMessage.success(isEditing.value ? '人物更新成功' : '人物创建成功')
    emit('update:open', false)
  } catch (error: any) {
    if (!error?.errorFields) antMessage.error(isEditing.value ? '人物更新失败' : '人物创建失败')
  } finally {
    saving.value = false
  }
}

const handleClose = () => emit('update:open', false)

watch(
  () => props.open,
  (value) => {
    if (!value) return
    const character = props.character
    // 编辑时复制数组和关系，避免表单输入直接改动列表数据。
    Object.assign(
      form,
      createDefaultForm(),
      character && {
        name: character.name,
        alias: [...character.alias],
        gender: character.gender,
        age: character.age,
        description: character.description,
        appearance: [...character.appearance],
        personality: [...character.personality],
        background: character.background,
        motivation: [...character.motivation],
        relations: character.relations.map((item) => ({
          ...item,
          targetId: item.targetId || undefined
        })),
        organizationRelations: character.organizationRelations.map((item) => ({
          ...item,
          targetId: item.targetId || undefined
        })),
        remark: character.remark
      }
    )
    formRef.value?.clearValidate()
  }
)
</script>

<style scoped lang="less">
.character-form {
  padding-right: 4px;
}

.form-section {
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.form-section h3 {
  margin: 0 0 14px;
  font-size: 15px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-heading h3 {
  margin-bottom: 0;
}

.relation-row {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(160px, 0.55fr) 32px;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.relation-expression {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.relation-expression :deep(.ant-select) {
  min-width: 140px;
  flex: 1;
}

.relation-expression :deep(.ant-input) {
  min-width: 110px;
  flex: 0.8;
}

.relation-subject {
  max-width: 120px;
  overflow: hidden;
  color: #1f2937;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relation-connector {
  flex: none;
  color: #64748b;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 768px) {
  .relation-row {
    grid-template-columns: minmax(0, 1fr) 32px;
  }

  .relation-expression {
    grid-column: 1 / 3;
    flex-wrap: wrap;
  }

  .relation-description {
    grid-column: 1;
  }
}
</style>
