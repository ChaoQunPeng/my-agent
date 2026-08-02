import type {
  CreateNovelPayload,
  CreateNovelCharacterPayload,
  CreateNovelOrganizationPayload,
  Novel,
  NovelCharacter,
  NovelOrganization,
  UpdateNovelPayload,
  UpdateNovelCharacterPayload,
  UpdateNovelOrganizationPayload,
} from "@/api/novel";
import {
  createNovel,
  createNovelCharacter,
  createNovelOrganization,
  deleteNovelCharacter,
  deleteNovelOrganization,
  getNovelCharacters,
  getNovelOrganizations,
  getNovels,
  updateNovel,
  updateNovelCharacter,
  updateNovelOrganization,
} from "@/api/novel";

export const useNovelAssistantStore = defineStore("novel-assistant", () => {
  const novels = ref<Novel[]>([]);
  const characters = ref<NovelCharacter[]>([]);
  const organizations = ref<NovelOrganization[]>([]);
  const selectedNovelId = ref("");
  const loadingNovels = ref(false);
  const loadingMaterials = ref(false);
  const chatTemperature = ref(0.5);

  const selectedNovel = computed(() =>
    novels.value.find((item) => item.id === selectedNovelId.value),
  );

  const fetchNovels = async () => {
    loadingNovels.value = true;
    try {
      const res = await getNovels();
      novels.value = res.data || [];

      if (
        selectedNovelId.value &&
        !novels.value.some((item) => item.id === selectedNovelId.value)
      ) {
        await selectNovel("");
      }
    } finally {
      loadingNovels.value = false;
    }
  };

  const fetchMaterials = async (novelId: string) => {
    if (!novelId) {
      characters.value = [];
      organizations.value = [];
      return;
    }

    loadingMaterials.value = true;
    try {
      const [characterRes, organizationRes] = await Promise.all([
        getNovelCharacters(novelId),
        getNovelOrganizations(novelId),
      ]);

      // 快速切换小说时忽略上一部小说的迟到响应。
      if (selectedNovelId.value !== novelId) return;
      characters.value = characterRes.data || [];
      organizations.value = organizationRes.data || [];
    } finally {
      if (selectedNovelId.value === novelId) {
        loadingMaterials.value = false;
      }
    }
  };

  const selectNovel = async (novelId: string) => {
    selectedNovelId.value = novelId;
    characters.value = [];
    organizations.value = [];
    await fetchMaterials(novelId);
  };

  const addNovel = async (data: CreateNovelPayload) => {
    const res = await createNovel(data);
    if (!res.data) throw new Error("小说创建失败");
    novels.value.unshift(res.data);
    await selectNovel(res.data.id);
    return res.data;
  };

  const editNovel = async (data: UpdateNovelPayload) => {
    const res = await updateNovel(data);
    if (!res.data) throw new Error("小说更新失败");

    // 直接替换当前列表记录，避免编辑后重新加载全部小说。
    const index = novels.value.findIndex((item) => item.id === res.data?.id);
    if (index !== -1) novels.value.splice(index, 1, res.data);
    return res.data;
  };

  const addCharacter = async (data: CreateNovelCharacterPayload) => {
    const res = await createNovelCharacter(data);
    if (!res.data) throw new Error("人物创建失败");
    characters.value.unshift(res.data);
    return res.data;
  };

  const updateCharacter = async (data: UpdateNovelCharacterPayload) => {
    const res = await updateNovelCharacter(data);
    if (!res.data) throw new Error("人物更新失败");

    // 用接口返回的最新人物替换列表记录，避免再次请求整个素材列表。
    const index = characters.value.findIndex(
      (item) => item.id === res.data?.id,
    );
    if (index !== -1) characters.value.splice(index, 1, res.data);
    return res.data;
  };

  const removeCharacter = async (id: string) => {
    await deleteNovelCharacter(id);

    // 接口成功后再移除本地记录，避免删除失败时列表状态失真。
    const index = characters.value.findIndex((item) => item.id === id);
    if (index !== -1) characters.value.splice(index, 1);
  };

  const addOrganization = async (data: CreateNovelOrganizationPayload) => {
    const res = await createNovelOrganization(data);
    if (!res.data) throw new Error("组织创建失败");
    organizations.value.unshift(res.data);
    return res.data;
  };

  const updateOrganization = async (data: UpdateNovelOrganizationPayload) => {
    const res = await updateNovelOrganization(data);
    if (!res.data) throw new Error("组织更新失败");

    // 用接口返回的最新组织替换列表记录，保持当前排序不变。
    const index = organizations.value.findIndex(
      (item) => item.id === res.data?.id,
    );
    if (index !== -1) organizations.value.splice(index, 1, res.data);
    return res.data;
  };

  const removeOrganization = async (id: string) => {
    await deleteNovelOrganization(id);

    // 接口成功后再移除本地记录，避免删除失败时列表状态失真。
    const index = organizations.value.findIndex((item) => item.id === id);
    if (index !== -1) organizations.value.splice(index, 1);
  };

  return {
    novels,
    characters,
    organizations,
    selectedNovelId,
    selectedNovel,
    loadingNovels,
    loadingMaterials,
    chatTemperature,
    fetchNovels,
    selectNovel,
    addNovel,
    editNovel,
    addCharacter,
    updateCharacter,
    removeCharacter,
    addOrganization,
    updateOrganization,
    removeOrganization,
  };
});
