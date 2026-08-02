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
          <a-select-option
            v-for="novel in novels"
            :key="novel.id"
            :value="novel.id"
            :label="novel.name"
          >
            {{ novel.name }}
          </a-select-option>
        </a-select>
        <a-tooltip title="新建小说">
          <a-button
            type="primary"
            aria-label="新建小说"
            @click="handleOpenCreateNovel"
          >
            <PlusOutlined />
          </a-button>
        </a-tooltip>
        <a-tooltip title="编辑小说">
          <a-button
            aria-label="编辑小说"
            :disabled="!selectedNovel"
            @click="handleOpenEditNovel"
          >
            <EditOutlined />
          </a-button>
        </a-tooltip>
      </div>
      <div v-if="selectedNovelId" class="temperature-control">
        <div class="temperature-control__header">
          <span class="temperature-control__label">
            温度（{{ chatTemperature }}）
          </span>
          <a-tooltip
            placement="topRight"
            overlay-class-name="temperature-tips-overlay"
          >
            <template #title>
              <div class="temperature-tips">
                <div class="temperature-tips__title">不同场景的推荐温度</div>
                <table class="temperature-tips__table">
                  <thead>
                    <tr>
                      <th>场景</th>
                      <th width="100">推荐温度</th>
                      <th>原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>代码生成、数学题、事实问答</td>
                      <td>0~0.3</td>
                      <td>需要准确、稳定，不要“发挥”</td>
                    </tr>
                    <tr>
                      <td>翻译、摘要、分类任务</td>
                      <td>0.3~0.5</td>
                      <td>保持准确但稍微灵活</td>
                    </tr>
                    <tr>
                      <td>创意写作、头脑风暴、闲聊</td>
                      <td>0.7~1.2</td>
                      <td>需要多样性和想象力</td>
                    </tr>
                    <tr>
                      <td>诗歌、故事、广告语</td>
                      <td>1.2~1.8</td>
                      <td>鼓励大胆的联想和表达</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <QuestionCircleOutlined class="temperature-control__icon" />
          </a-tooltip>
        </div>
        <a-slider
          v-model:value="chatTemperature"
          :min="0"
          :max="2"
          :step="0.1"
          class="temperature-control__slider"
        />
      </div>
    </div>

    <a-spin :spinning="loadingMaterials">
      <a-input
        v-if="selectedNovelId && activeTab === 'characters'"
        v-model:value="characterKeyword"
        placeholder="搜索人物姓名"
        allow-clear
        class="character-search"
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </a-input>
      <a-tabs
        v-if="selectedNovelId"
        v-model:activeKey="activeTab"
        class="material-tabs"
      >
        <a-tab-pane key="characters">
          <template #tab
            >人物
            <span class="tab-count">{{ characters.length }}</span></template
          >
          <div class="material-toolbar">
            <span class="material-toolbar__title">人物</span>
            <a-button
              type="primary"
              size="small"
              @click="handleCreateCharacter"
            >
              <PlusOutlined />新建
            </a-button>
          </div>
          <div class="material-list">
            <div
              v-for="character in filteredCharacters"
              :key="character.id"
              class="material-item"
            >
              <div class="material-item__header">
                <div class="material-item__main">
                  <button
                    type="button"
                    class="material-item__name"
                    @click="handleEditCharacter(character)"
                  >
                    {{ character.name }}
                  </button>
                  <div class="material-item__description">
                    {{
                      character.description ||
                      character.background ||
                      "暂无简介"
                    }}
                  </div>
                </div>
                <a-popconfirm
                  :title="`确认删除人物“${character.name}”吗？`"
                  description="删除后无法恢复。"
                  ok-text="删除"
                  cancel-text="取消"
                  ok-type="danger"
                  placement="left"
                  @confirm="handleDeleteCharacter(character)"
                >
                  <a-tooltip title="删除人物">
                    <a-button
                      type="text"
                      danger
                      size="small"
                      aria-label="删除人物"
                      :loading="
                        deletingMaterialKey === `character:${character.id}`
                      "
                    >
                      <DeleteOutlined />
                    </a-button>
                  </a-tooltip>
                </a-popconfirm>
              </div>
              <div class="material-item__meta">
                <a-tag>{{ character.gender }}</a-tag>
                <span>{{ character.age }}岁</span>
              </div>
            </div>
            <a-empty
              v-if="characters.length === 0"
              description="暂无人物"
              :image="simpleImage"
            />
            <a-empty
              v-else-if="filteredCharacters.length === 0"
              description="未找到匹配的人物"
              :image="simpleImage"
            />
          </div>
        </a-tab-pane>

        <a-tab-pane key="organizations">
          <template #tab
            >组织
            <span class="tab-count">{{ organizations.length }}</span></template
          >
          <div class="material-toolbar">
            <span class="material-toolbar__title">组织</span>
            <a-button
              type="primary"
              size="small"
              @click="handleCreateOrganization"
            >
              <PlusOutlined />新建
            </a-button>
          </div>
          <div class="material-list">
            <div
              v-for="organization in organizations"
              :key="organization.id"
              class="material-item"
            >
              <div class="material-item__header">
                <div class="material-item__main">
                  <button
                    type="button"
                    class="material-item__name"
                    @click="handleEditOrganization(organization)"
                  >
                    {{ organization.name }}
                  </button>
                  <div class="material-item__description">
                    {{
                      organization.description ||
                      organization.background ||
                      "暂无简介"
                    }}
                  </div>
                </div>
                <a-popconfirm
                  :title="`确认删除组织“${organization.name}”吗？`"
                  description="删除后无法恢复。"
                  ok-text="删除"
                  cancel-text="取消"
                  ok-type="danger"
                  placement="left"
                  @confirm="handleDeleteOrganization(organization)"
                >
                  <a-tooltip title="删除组织">
                    <a-button
                      type="text"
                      danger
                      size="small"
                      aria-label="删除组织"
                      :loading="
                        deletingMaterialKey ===
                        `organization:${organization.id}`
                      "
                    >
                      <DeleteOutlined />
                    </a-button>
                  </a-tooltip>
                </a-popconfirm>
              </div>
              <div
                v-if="organization.alias.length"
                class="material-item__aliases"
              >
                {{ organization.alias.join(" / ") }}
              </div>
            </div>
            <a-empty
              v-if="organizations.length === 0"
              description="暂无组织"
              :image="simpleImage"
            />
          </div>
        </a-tab-pane>
      </a-tabs>

      <div v-else class="operation-panel__empty">
        <a-empty description="请先选择小说" :image="simpleImage" />
      </div>
    </a-spin>

    <a-drawer
      v-model:open="novelDrawerOpen"
      :title="editingNovel ? '编辑小说' : '新建小说'"
      :width="800"
      :body-style="{ padding: '0' }"
    >
      <a-form
        class="h-full"
        ref="novelFormRef"
        :model="novelForm"
        :rules="novelRules"
        layout="vertical"
      >
        <a-tabs
          v-model:activeKey="novelTab"
          tab-position="left"
          class="novel-form-tabs h-full"
        >
          <a-tab-pane key="basic" tab="小说名称">
            <a-form-item name="name" class="p-24">
              <a-input
                v-model:value="novelForm.name"
                placeholder="小说名称"
                @press-enter="handleSaveNovel"
              />
            </a-form-item>
          </a-tab-pane>
          <a-tab-pane
            v-for="section in novelContentSections"
            :key="section.key"
            :tab="section.label"
          >
            <a-form-item :name="section.key" class="novel-content-form-item">
              <a-textarea
                v-model:value="novelForm[section.key]"
                :placeholder="`请输入${section.label}`"
                class="novel-content-textarea"
              />
            </a-form-item>
          </a-tab-pane>
        </a-tabs>
      </a-form>
      <template #footer>
        <div class="novel-drawer__footer">
          <a-button @click="novelDrawerOpen = false">取消</a-button>
          <a-button
            type="primary"
            :loading="savingNovel"
            @click="handleSaveNovel"
          >
            {{ editingNovel ? "保存" : "创建" }}
          </a-button>
        </div>
      </template>
    </a-drawer>

    <CharacterCreateModal
      v-model:open="characterModalOpen"
      :character="selectedCharacter"
    />
    <OrganizationCreateModal
      v-model:open="organizationModalOpen"
      :organization="selectedOrganization"
    />
  </div>
</template>

<script setup lang="ts">
import type { FormInstance } from "ant-design-vue";
import type { NovelCharacter, NovelOrganization } from "@/api/novel";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons-vue";
import { Empty, message as antMessage } from "ant-design-vue";
import { useNovelAssistantStore } from "@/stores/novel-assistant";
import CharacterCreateModal from "./character-create-modal.vue";
import OrganizationCreateModal from "./organization-create-modal.vue";

const store = useNovelAssistantStore();
const {
  novels,
  characters,
  organizations,
  selectedNovelId,
  selectedNovel,
  loadingNovels,
  loadingMaterials,
  chatTemperature,
} = storeToRefs(store);

const activeTab = ref("characters");
const characterKeyword = ref("");

// 按姓名关键字过滤人物列表，空关键字时展示全部人物。
const filteredCharacters = computed(() => {
  const keyword = characterKeyword.value.trim().toLowerCase();
  if (!keyword) return characters.value;
  return characters.value.filter((character) =>
    character.name.toLowerCase().includes(keyword),
  );
});

const novelDrawerOpen = ref(false);
const novelTab = ref("basic");
const editingNovel = ref(false);
const characterModalOpen = ref(false);
const organizationModalOpen = ref(false);
const selectedCharacter = ref<NovelCharacter | null>(null);
const selectedOrganization = ref<NovelOrganization | null>(null);
const savingNovel = ref(false);
const deletingMaterialKey = ref("");
const novelFormRef = ref<FormInstance>();
// 界面分项编辑，保存时统一组装为 Markdown content。
const novelContentSections = [
  { key: "targetAudience", label: "目标读者" },
  { key: "storyBackground", label: "故事背景" },
  { key: "storySynopsis", label: "故事梗概" },
  { key: "worldSetting", label: "世界观" },
  { key: "characterSetting", label: "人物设定" },
  { key: "objectSetting", label: "事物设定" },
  { key: "storyOutline", label: "故事大纲" },
  { key: "inspirationLibrary", label: "灵感库" },
  { key: "emotionalPoints", label: "情绪点" },
  { key: "storyMetaphor", label: "故事隐喻" },
] as const;
type NovelContentSectionKey = (typeof novelContentSections)[number]["key"];

const createEmptyNovelContent = () =>
  Object.fromEntries(
    novelContentSections.map((section) => [section.key, ""]),
  ) as Record<NovelContentSectionKey, string>;

const sectionKeyByHeading = new Map<string, NovelContentSectionKey>(
  novelContentSections.map(
    (section) => [`## ${section.label}`, section.key] as const,
  ),
);
const novelForm = reactive({ name: "", ...createEmptyNovelContent() });
const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;
const novelRules = {
  name: [{ required: true, whitespace: true, message: "请输入小说名称" }],
};

const serializeNovelContent = () =>
  novelContentSections
    .map((section) => {
      const value = novelForm[section.key].trim();
      return value ? `## ${section.label}\n\n${value}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

const parseNovelContent = (content: string) => {
  const parsed = createEmptyNovelContent();
  const legacyLines: string[] = [];
  let activeKey: NovelContentSectionKey | null = null;

  for (const line of content.split(/\r?\n/)) {
    const sectionKey = sectionKeyByHeading.get(line.trim());
    if (sectionKey) {
      activeKey = sectionKey;
      continue;
    }

    if (activeKey) {
      parsed[activeKey] += `${parsed[activeKey] ? "\n" : ""}${line}`;
    } else {
      legacyLines.push(line);
    }
  }

  novelContentSections.forEach((section) => {
    parsed[section.key] = parsed[section.key].trim();
  });

  // 旧格式没有分段标题，放入故事大纲避免编辑时丢失。
  const legacyContent = legacyLines.join("\n").trim();
  if (legacyContent) {
    parsed.storyOutline = [legacyContent, parsed.storyOutline]
      .filter(Boolean)
      .join("\n\n");
  }

  return parsed;
};

const handleOpenCreateNovel = () => {
  editingNovel.value = false;
  Object.assign(novelForm, { name: "", ...createEmptyNovelContent() });
  novelTab.value = "basic";
  novelDrawerOpen.value = true;
};

const handleOpenEditNovel = () => {
  if (!selectedNovel.value) return;

  // 打开编辑弹窗时复制当前小说，取消编辑不会直接改变列表数据。
  editingNovel.value = true;
  Object.assign(novelForm, {
    name: selectedNovel.value.name,
    ...parseNovelContent(selectedNovel.value.content || ""),
  });
  novelTab.value = "basic";
  novelDrawerOpen.value = true;
};

const handleCreateCharacter = () => {
  selectedCharacter.value = null;
  characterModalOpen.value = true;
};

const handleEditCharacter = (character: NovelCharacter) => {
  selectedCharacter.value = character;
  characterModalOpen.value = true;
};

const handleCreateOrganization = () => {
  selectedOrganization.value = null;
  organizationModalOpen.value = true;
};

const handleEditOrganization = (organization: NovelOrganization) => {
  selectedOrganization.value = organization;
  organizationModalOpen.value = true;
};

const handleDeleteCharacter = async (character: NovelCharacter) => {
  const materialKey = `character:${character.id}`;
  deletingMaterialKey.value = materialKey;
  try {
    await store.removeCharacter(character.id);
    antMessage.success("人物删除成功");
  } catch (error) {
    antMessage.error("人物删除失败");
  } finally {
    if (deletingMaterialKey.value === materialKey)
      deletingMaterialKey.value = "";
  }
};

const handleDeleteOrganization = async (organization: NovelOrganization) => {
  const materialKey = `organization:${organization.id}`;
  deletingMaterialKey.value = materialKey;
  try {
    await store.removeOrganization(organization.id);
    antMessage.success("组织删除成功");
  } catch (error) {
    antMessage.error("组织删除失败");
  } finally {
    if (deletingMaterialKey.value === materialKey)
      deletingMaterialKey.value = "";
  }
};

const handleNovelChange = async (value: unknown) => {
  if (typeof value !== "string") return;
  try {
    await store.selectNovel(value);
  } catch (error) {
    antMessage.error("小说素材加载失败");
  }
};

const handleSaveNovel = async () => {
  try {
    await novelFormRef.value?.validate();
    savingNovel.value = true;
    const novelData = {
      name: novelForm.name.trim(),
      content: serializeNovelContent(),
    };

    if (editingNovel.value && selectedNovel.value) {
      await store.editNovel({ id: selectedNovel.value.id, ...novelData });
    } else {
      await store.addNovel(novelData);
    }

    novelDrawerOpen.value = false;
    antMessage.success(editingNovel.value ? "小说更新成功" : "小说创建成功");
  } catch (error: any) {
    if (!error?.errorFields)
      antMessage.error(editingNovel.value ? "小说更新失败" : "小说创建失败");
  } finally {
    savingNovel.value = false;
  }
};

onMounted(async () => {
  try {
    await store.fetchNovels();
  } catch (error) {
    antMessage.error("小说列表加载失败");
  }
});
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

.character-search {
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

.material-item__header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.material-item__main {
  flex: 1;
  min-width: 0;
}

.material-item__name {
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  font-weight: 600;
  color: #1f2937;
  cursor: pointer;
  text-align: left;
}

.material-item__name:hover {
  color: #1677ff;
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

.novel-form-tabs :deep(.ant-tabs-nav) {
  padding-top: 12px;
}

.novel-form-tabs :deep(.ant-tabs-content-holder),
.novel-form-tabs :deep(.ant-tabs-content),
.novel-form-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  min-height: 0;
}

.novel-form-tabs :deep(.ant-tabs-tabpane) {
  padding: 0 !important;
}

.novel-content-form-item {
  height: 100%;
  margin-bottom: 0;
}

// 内容编辑区逐层继承 Tab 高度，使文本域占满抽屉的可用空间。
.novel-content-form-item :deep(.ant-form-item-row),
.novel-content-form-item :deep(.ant-form-item-control),
.novel-content-form-item :deep(.ant-form-item-control-input),
.novel-content-form-item :deep(.ant-form-item-control-input-content) {
  height: 100%;
  min-height: 0;
}

.novel-form-tabs :deep(.novel-content-textarea) {
  height: 100%;
  border: 0;
  box-shadow: none;
  resize: none;
  padding: 16px 22px;
  font-size: 16px;
}

.novel-form-tabs :deep(.novel-content-textarea::placeholder) {
  font-size: 16px;
}

.novel-form-tabs :deep(.ant-form-item .ant-form-item-label) {
  margin-bottom: 8px;

  label {
    font-size: 16px;
  }
}

.novel-drawer__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.temperature-control {
  margin-top: 16px;
  padding-bottom: 12px;
}

.temperature-control__header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.temperature-control__label {
  font-size: 14px;
}

.temperature-control__slider {
  margin: 12px 4px 0 8px;
}

.temperature-control__icon {
  font-size: 14px;
  color: #a3aab8;
  cursor: help;
}

.temperature-control__icon:hover {
  color: #1677ff;
}
</style>

<style lang="less">
.temperature-tips-overlay {
  max-width: 420px;

  .temperature-tips__title {
    margin-bottom: 8px;
    font-weight: 600;
  }

  .temperature-tips__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    line-height: 1.6;

    th,
    td {
      padding: 4px 8px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      text-align: left;
    }

    th {
      font-weight: 600;
    }
  }
}
</style>
