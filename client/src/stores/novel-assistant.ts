import type {
  CreateNovelCharacterPayload,
  CreateNovelOrganizationPayload,
  Novel,
  NovelCharacter,
  NovelOrganization
} from '@/api/novel'
import {
  createNovel,
  createNovelCharacter,
  createNovelOrganization,
  getNovelCharacters,
  getNovelOrganizations,
  getNovels
} from '@/api/novel'

export const useNovelAssistantStore = defineStore('novel-assistant', () => {
  const novels = ref<Novel[]>([])
  const characters = ref<NovelCharacter[]>([])
  const organizations = ref<NovelOrganization[]>([])
  const selectedNovelId = ref('')
  const loadingNovels = ref(false)
  const loadingMaterials = ref(false)

  const selectedNovel = computed(() => novels.value.find((item) => item.id === selectedNovelId.value))

  const fetchNovels = async () => {
    loadingNovels.value = true
    try {
      const res = await getNovels()
      novels.value = res.data || []

      if (selectedNovelId.value && !novels.value.some((item) => item.id === selectedNovelId.value)) {
        await selectNovel('')
      }
    } finally {
      loadingNovels.value = false
    }
  }

  const fetchMaterials = async (novelId: string) => {
    if (!novelId) {
      characters.value = []
      organizations.value = []
      return
    }

    loadingMaterials.value = true
    try {
      const [characterRes, organizationRes] = await Promise.all([
        getNovelCharacters(novelId),
        getNovelOrganizations(novelId)
      ])

      // 快速切换小说时忽略上一部小说的迟到响应。
      if (selectedNovelId.value !== novelId) return
      characters.value = characterRes.data || []
      organizations.value = organizationRes.data || []
    } finally {
      if (selectedNovelId.value === novelId) {
        loadingMaterials.value = false
      }
    }
  }

  const selectNovel = async (novelId: string) => {
    selectedNovelId.value = novelId
    characters.value = []
    organizations.value = []
    await fetchMaterials(novelId)
  }

  const addNovel = async (name: string) => {
    const res = await createNovel(name)
    if (!res.data) throw new Error('小说创建失败')
    novels.value.unshift(res.data)
    await selectNovel(res.data.id)
    return res.data
  }

  const addCharacter = async (data: CreateNovelCharacterPayload) => {
    const res = await createNovelCharacter(data)
    if (!res.data) throw new Error('人物创建失败')
    characters.value.unshift(res.data)
    return res.data
  }

  const addOrganization = async (data: CreateNovelOrganizationPayload) => {
    const res = await createNovelOrganization(data)
    if (!res.data) throw new Error('组织创建失败')
    organizations.value.unshift(res.data)
    return res.data
  }

  return {
    novels,
    characters,
    organizations,
    selectedNovelId,
    selectedNovel,
    loadingNovels,
    loadingMaterials,
    fetchNovels,
    selectNovel,
    addNovel,
    addCharacter,
    addOrganization
  }
})
