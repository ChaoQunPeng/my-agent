import request from '@/utils/request'

/**
 * 人物信息接口定义
 */
export interface Character {
  _id: string // MongoDB 自动生成的唯一标识ID
  characterId: string // 自定义的人物唯一标识（如：char_1776599676755_d4x5gbz75）
  name: string // 姓名（必填）
  gender?: number // 性别：0-未知, 1-男, 2-女, 3-其他（可选，默认0）
  birthday?: string // 出生年月：ISO 8601 格式日期字符串（可选）
  appearance?: string // 外貌描述（可选）
  profession?: string // 职业（可选）
  personalityDescription?: string // 性格描述（可选）
  relation?: string // 与我的关系（可选）
  behaviorAtlas?: string[] // 行为图谱数组（可选）
  age?: number | null // 年龄（虚拟属性，根据birthday计算得出）
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
export function createCharacter(data: Omit<Character, '_id' | 'createdAt' | 'updatedAt' | 'age'>) {
  return request.post<Character>('/characters/create', data)
}

/**
 * 获取人物详情
 */
export function getCharacterDetail(id: string) {
  return request.post<Character>('/characters/detail', { id })
}

/**
 * 更新人物信息
 */
export function updateCharacter(id: string, data: Partial<Omit<Character, '_id' | 'createdAt' | 'updatedAt' | 'age'>>) {
  return request.post<Character>('/characters/update', { id, ...data })
}

/**
 * 删除人物
 */
export function deleteCharacter(id: string) {
  return request.post('/characters/delete', { id })
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
