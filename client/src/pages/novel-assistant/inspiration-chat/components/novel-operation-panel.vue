<template>
  <div class="operation-panel">
    <div class="operation-panel__header">
      <div class="operation-panel__title">当前小说</div>
      <div class="novel-selector">
        <a-select
          :value="selectedNovelId || undefined"
          :loading="loadingNovels"
          placeholder="选择小说"
          show-search
          option-filter-prop="label"
          class="novel-selector__select"
          @change="handleNovelChange"
        >
          <a-select-option v-for="novel in novels" :key="novel.id" :value="novel.id" :label="novel.name">
            {{ novel.name }}
          </a-select-option>
        </a-select>
        <a-tooltip title="新建小说">
          <a-button type="primary" aria-label="新建小说" @click="novelModalOpen = true">
            <PlusOutlined />
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <a-spin :spinning="loadingMaterials">
      <a-tabs v-if="selectedNovelId" v-model:activeKey="activeTab" class="material-tabs">
        <a-tab-pane key="characters">
          <template #tab
            >人物 <span class="tab-count">{{ characters.length }}</span></template
          >
          <div class="material-toolbar">
            <span class="material-toolbar__title">人物</span>
            <a-button type="primary" size="small" @click="characterModalOpen = true"> <PlusOutlined />新建 </a-button>
          </div>
          <div class="material-list">
            <div v-for="character in characters" :key="character.id" class="material-item">
              <div class="material-item__main">
                <div class="material-item__name">{{ character.name }}</div>
                <div class="material-item__description">
                  {{ character.description || character.background || '暂无简介' }}
                </div>
              </div>
              <div class="material-item__meta">
                <a-tag>{{ character.gender }}</a-tag>
                <span>{{ character.age }}岁</span>
              </div>
            </div>
            <a-empty v-if="characters.length === 0" description="暂无人物" :image="simpleImage" />
          </div>
        </a-tab-pane>

        <a-tab-pane key="organizations">
          <template #tab
            >组织 <span class="tab-count">{{ organizations.length }}</span></template
          >
          <div class="material-toolbar">
            <span class="material-toolbar__title">组织</span>
            <a-button type="primary" size="small" @click="organizationModalOpen = true">
              <PlusOutlined />新建
            </a-button>
          </div>
          <div class="material-list">
            <div v-for="organization in organizations" :key="organization.id" class="material-item">
              <div class="material-item__main">
                <div class="material-item__name">{{ organization.name }}</div>
                <div class="material-item__description">
                  {{ organization.description || organization.background || '暂无简介' }}
                </div>
              </div>
              <div v-if="organization.alias.length" class="material-item__aliases">
                {{ organization.alias.join(' / ') }}
              </div>
            </div>
            <a-empty v-if="organizations.length === 0" description="暂无组织" :image="simpleImage" />
          </div>
        </a-tab-pane>
      </a-tabs>

      <div v-else class="operation-panel__empty">
        <a-empty description="请先选择小说" :image="simpleImage" />
      </div>
    </a-spin>

    <a-modal
      v-model:open="novelModalOpen"
      title="新建小说"
      ok-text="创建"
      cancel-text="取消"
      :confirm-loading="creatingNovel"
      @ok="handleCreateNovel"
    >
      <a-form ref="novelFormRef" :model="novelForm" :rules="novelRules" layout="vertical">
        <a-form-item label="小说名称" name="name">
          <a-input v-model:value="novelForm.name" placeholder="小说名称" @press-enter="handleCreateNovel" />
        </a-form-item>
      </a-form>
    </a-modal>

    <CharacterCreateModal v-model:open="characterModalOpen" />
    <OrganizationCreateModal v-model:open="organizationModalOpen" />
  </div>
</template>

<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { Empty, message as antMessage } from 'ant-design-vue'
import { useNovelAssistantStore } from '@/stores/novel-assistant'
import CharacterCreateModal from './character-create-modal.vue'
import OrganizationCreateModal from './organization-create-modal.vue'

const store = useNovelAssistantStore()
const { novels, characters, organizations, selectedNovelId, loadingNovels, loadingMaterials } = storeToRefs(store)

const activeTab = ref('characters')
const novelModalOpen = ref(false)
const characterModalOpen = ref(false)
const organizationModalOpen = ref(false)
const creatingNovel = ref(false)
const novelFormRef = ref<FormInstance>()
const novelForm = reactive({ name: '' })
const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const novelRules = {
  name: [{ required: true, whitespace: true, message: '请输入小说名称' }]
}

const handleNovelChange = async (value: unknown) => {
  if (typeof value !== 'string') return
  try {
    await store.selectNovel(value)
  } catch (error) {
    antMessage.error('小说素材加载失败')
  }
}

const handleCreateNovel = async () => {
  try {
    await novelFormRef.value?.validate()
    creatingNovel.value = true
    await store.addNovel(novelForm.name.trim())
    novelForm.name = ''
    novelModalOpen.value = false
    antMessage.success('小说创建成功')
  } catch (error: any) {
    if (!error?.errorFields) antMessage.error('小说创建失败')
  } finally {
    creatingNovel.value = false
  }
}

onMounted(async () => {
  try {
    await store.fetchNovels()
  } catch (error) {
    antMessage.error('小说列表加载失败')
  }
})
</script>

<style scoped lang="less">
.operation-panel {
  min-height: 100%;
  padding: 18px 18px 24px;
  background: #fff;
}

.operation-panel__header {
  padding-bottom: 18px;
  border-bottom: 1px solid #f0f0f0;
}

.operation-panel__title,
.material-toolbar__title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.novel-selector {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.novel-selector__select {
  flex: 1;
  min-width: 0;
}

.material-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 12px;
}

.tab-count {
  display: inline-flex;
  min-width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  padding: 0 6px;
  border-radius: 10px;
  background: #f0f2f5;
  color: #64748b;
  font-size: 12px;
}

.material-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.material-list {
  display: flex;
  flex-direction: column;
}

.material-item {
  padding: 13px 0;
  border-bottom: 1px solid #f0f0f0;
}

.material-item__main {
  min-width: 0;
}

.material-item__name {
  font-weight: 600;
  color: #1f2937;
}

.material-item__description {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.material-item__meta,
.material-item__aliases {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: #8c8c8c;
  font-size: 12px;
}

.operation-panel__empty {
  padding: 72px 0;
}
</style>
