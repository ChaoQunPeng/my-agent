<template>
  <a-modal
    :open="open"
    title="新建组织"
    width="720px"
    :confirm-loading="saving"
    ok-text="创建"
    cancel-text="取消"
    @ok="handleSubmit"
    @cancel="handleClose"
  >
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
  </a-modal>
</template>

<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue'
import type { CreateNovelOrganizationPayload } from '@/api/novel'
import { message as antMessage } from 'ant-design-vue'
import { useNovelAssistantStore } from '@/stores/novel-assistant'

const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

type OrganizationFormState = Omit<CreateNovelOrganizationPayload, 'novelId'>

const store = useNovelAssistantStore()
const { selectedNovelId } = storeToRefs(store)
const formRef = ref<FormInstance>()
const saving = ref(false)

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
    await store.addOrganization({
      ...form,
      novelId: selectedNovelId.value,
      name: form.name.trim(),
      alias: normalizeTags(form.alias),
      motivation: normalizeTags(form.motivation)
    })
    antMessage.success('组织创建成功')
    emit('update:open', false)
  } catch (error: any) {
    if (!error?.errorFields) antMessage.error('组织创建失败')
  } finally {
    saving.value = false
  }
}

const handleClose = () => emit('update:open', false)

watch(
  () => props.open,
  (value) => {
    if (!value) return
    Object.assign(form, createDefaultForm())
    formRef.value?.clearValidate()
  }
)
</script>

<style scoped lang="less">
.organization-form {
  max-height: 68vh;
  overflow-y: auto;
  padding-right: 12px;
}
</style>
