import request from '@/utils/request'

/**
 * 会话接口定义
 */
export interface Session {
  sessionId: string
  title: string
  summary: string
  category?: string
  type?: string // 资源类型：'character'（角色）| 'novel'（小说）
  resourceId?: string // 资源ID：对应type类型的资源ID
  createdAt: string
  updatedAt: string
}

/**
 * 消息接口定义
 */
export interface Message {
  _id?: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  createdAt?: string
  updatedAt?: string
}

/**
 * 获取所有会话列表
 * @param category 可选的分类筛选条件
 * @param type 可选的资源类型筛选条件（'character' | 'novel'）
 * @param resourceId 可选的资源ID筛选条件
 */
export function getSessions(category?: string, type?: string, resourceId?: string) {
  const params: any = {}
  if (category) {
    params.category = category
  }
  if (type) {
    params.type = type
  }
  return request.post<Session[]>('/sessions/list', params)
}

/**
 * 创建新会话
 * @param data 会话数据，包含标题、摘要、分类、资源类型和资源ID
 */
export function createSession(data?: { title?: string; summary?: string; category?: string; type?: string; resourceId?: string }) {
  return request.post<Session>('/sessions/create', data || {})
}

/**
 * 获取会话详情（包含消息历史）
 * @param sessionId 会话ID
 */
export function getSessionDetail(sessionId: string) {
  return request.post<{ session: Session; messages: Message[] }>('/sessions/detail', { id: sessionId })
}

/**
 * 更新会话信息
 * @param sessionId 会话ID
 * @param data 更新的会话数据
 */
export function updateSession(
  sessionId: string,
  data: { title?: string; summary?: string; category?: string; type?: string; resourceId?: string }
) {
  return request.post<Session>('/sessions/update', { id: sessionId, ...data })
}

/**
 * 删除会话
 * @param sessionId 会话ID
 */
export function deleteSession(sessionId: string) {
  return request.post('/sessions/delete', { id: sessionId })
}

/**
 * 添加消息到会话
 * @param sessionId 会话ID
 * @param role 消息角色
 * @param content 消息内容
 */
export function addMessage(sessionId: string, role: string, content: string) {
  return request.post<Message>('/sessions/add-message', { id: sessionId, role, content })
}

/**
 * 获取会话的消息历史
 * @param sessionId 会话ID
 */
export function getSessionMessages(sessionId: string) {
  return request.post<Message[]>('/sessions/get-message-history', { id: sessionId })
}

/**
 * 清空会话的所有消息
 * @param sessionId 会话ID
 */
export function clearSessionMessages(sessionId: string) {
  return request.post('/sessions/clear-messages', { id: sessionId })
}

/**
 * 清除临时会话的所有消息（不保存记录的聊天）
 */
export function clearTempMessages() {
  return request.post('/chat/clear-test-messages', {})
}
