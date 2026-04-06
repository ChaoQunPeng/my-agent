import request from '@/utils/request'

/**
 * 人物信息接口定义
 */
export interface Character {
  characterId: string // 人物唯一标识ID
  name: string // 姓名
  gender: number // 性别：0-未知, 1-男, 2-女
  age: number // 年龄
  appearance: string // 外貌描述
  profession: string // 职业
  personalityOverview: string // 性格概述
  personalityTags: string[] // 性格标签数组
  behaviorDescriptions: string[] // 行为描述数组
  createdAt: string // 创建时间
  updatedAt: string // 更新时间
}

/**
 * 获取所有人物列表
 */
export function getCharacters() {
  return request.post<Character[]>('/characters/list')
}

/**
 * 创建新人物
 */
export function createCharacter(data: Omit<Character, 'characterId' | 'createdAt' | 'updatedAt'>) {
  return request.post<Character>('/characters/create', data)
}

/**
 * 获取人物详情
 */
export function getCharacterDetail(characterId: string) {
  return request.post<Character>('/characters/detail', { id: characterId })
}

/**
 * 更新人物信息
 */
export function updateCharacter(characterId: string, data: Partial<Omit<Character, 'characterId' | 'createdAt' | 'updatedAt'>>) {
  return request.post<Character>('/characters/update', { id: characterId, ...data })
}

/**
 * 删除人物
 */
export function deleteCharacter(characterId: string) {
  return request.post('/characters/delete', { id: characterId })
}

/**
 * 将人物绑定到会话
 */
export function bindCharacterToSession(characterId: string, sessionId: string) {
  return request.post<Character>('/characters/bind-session', { characterId, sessionId })
}

/**
 * 获取绑定到指定会话的人物
 */
export function getCharacterBySessionId(sessionId: string) {
  return request.post<Character | null>('/characters/find-by-session', { sessionId })
}

/**
 * 从会话中解绑人物
 */
export function unbindCharacterFromSession(characterId: string, sessionId: string) {
  return request.post<Character>('/characters/unbind-session', { characterId, sessionId })
}
