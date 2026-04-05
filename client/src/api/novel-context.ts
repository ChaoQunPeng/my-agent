import request from '@/utils/request'

export interface Character {
  name: string
  identity?: string
  personality?: string
  goals?: string
  traits?: string
}

export interface NovelConfig {
  sessionId: string
  sessionCategory?: string
  title: string
  synopsis: string
  world_background?: string
  world_logic_rules?: string
  world_geography?: string
  main_outline: string
  writing_tone?: string
  characters_list?: Character[]
  writing_perspective?: '第一人称' | '第三人称有限视角' | '第三人称上帝视角'
  target_word_count?: number
  avoid_plots?: string[]
  forbidden_words?: string[]
  logic_redlines?: string
  volume_goal?: string
  chapter_goal?: string
  updated_at?: string
}

/**
 * 创建或更新小说配置
 */
export function createOrUpdateNovelConfig(data: NovelConfig) {
  return request.post<NovelConfig>('/novel-context/create-or-update', data)
}

/**
 * 根据 sessionId 获取小说配置
 */
export function getNovelConfig(sessionId: string) {
  return request.post<NovelConfig | null>('/novel-context/find-by-session-id', { sessionId })
}

/**
 * 更新小说配置
 */
export function updateNovelConfig(sessionId: string, data: Partial<NovelConfig>) {
  return request.post<NovelConfig>('/novel-context/update', { sessionId, ...data })
}

/**
 * 删除小说配置
 */
export function deleteNovelConfig(sessionId: string) {
  return request.post('/novel-context/delete', { sessionId })
}
