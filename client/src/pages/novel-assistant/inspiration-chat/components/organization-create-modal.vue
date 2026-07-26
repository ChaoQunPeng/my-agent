<template>
  <a-drawer :open="open" :title="isEditing ? '编辑组织' : '新建组织'" width="min(720px, 100vw)" @close="handleClose">
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" class="organization-form">
      <a-form-item label="组织名称" name="name">
        <a-input v-model:value="form.name" placeholder="组织名称" />
      </a-form-item>
      <a-form-item label="组织别名">
        <a-select
          v-model:value="form.alias"
          mode="tags"
          :open="false"
          :token-separators="[',', '，']"
          placeholder="输入后按回车"
        />
      </a-form-item>
      <a-form-item label="组织简介">
        <a-textarea v-model:value="form.description" :rows="3" />
      </a-form-item>
      <a-form-item label="组织背景">
        <a-textarea v-model:value="form.background" :rows="4" />
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
      <a-form-item label="组织理念">
        <a-textarea v-model:value="form.belief" :rows="3" />
      </a-form-item>
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
import type { CreateNovelOrganizationPayload, NovelOrganization } from '@/api/novel'
import { message as antMessage } from 'ant-design-vue'
import { useNovelAssistantStore } from '@/stores/novel-assistant'

const props = defineProps<{
  open: boolean
  organization?: NovelOrganization | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

type OrganizationFormState = Omit<CreateNovelOrganizationPayload, 'novelId'>

const store = useNovelAssistantStore()
const { selectedNovelId } = storeToRefs(store)
const formRef = ref<FormInstance>()
const saving = ref(false)
const isEditing = computed(() => Boolean(props.organization))

const createDefaultForm = (): OrganizationFormState => ({
  name: '',
  alias: [],
  description: '',
  background: '',
  motivation: [],
  belief: '',
  remark: ''
})

const form = reactive<OrganizationFormState>(createDefaultForm())
const rules = {
  name: [{ required: true, whitespace: true, message: '请输入组织名称' }]
}

const normalizeTags = (items: string[]) => items.map((item) => item.trim()).filter(Boolean)

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    if (!selectedNovelId.value) {
      antMessage.warning('请先选择小说')
      return
    }

    saving.value = true
    // 新建和编辑共用同一份清理后的表单数据。
    const normalizedForm: OrganizationFormState = {
      ...form,
      name: form.name.trim(),
      alias: normalizeTags(form.alias),
      motivation: normalizeTags(form.motivation)
    }

    if (props.organization) {
      await store.updateOrganization({
        id: props.organization.id,
        ...normalizedForm
      })
    } else {
      await store.addOrganization({
        ...normalizedForm,
        novelId: selectedNovelId.value
      })
    }
    antMessage.success(isEditing.value ? '组织更新成功' : '组织创建成功')
    emit('update:open', false)
  } catch (error: any) {
    if (!error?.errorFields) antMessage.error(isEditing.value ? '组织更新失败' : '组织创建失败')
  } finally {
    saving.value = false
  }
}

const handleClose = () => emit('update:open', false)

watch(
  () => props.open,
  (value) => {
    if (!value) return
    const organization = props.organization
    // 编辑时复制数组，避免表单输入直接改动列表数据。
    Object.assign(
      form,
      createDefaultForm(),
      organization && {
        name: organization.name,
        alias: [...organization.alias],
        description: organization.description,
        background: organization.background,
        motivation: [...organization.motivation],
        belief: organization.belief,
        remark: organization.remark
      }
    )
    formRef.value?.clearValidate()
  }
)
</script>

<style scoped lang="less">
.organization-form {
  padding-right: 4px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
