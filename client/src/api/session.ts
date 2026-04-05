import request from '@/utils/request'

export interface Session {
  sessionId: string
  title: string
  summary: string
  category?: string
  createdAt: string
  updatedAt: string
}

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
 */
export function getSessions(category?: string) {
  return request.get<Session[]>('/sessions', { params: category ? { category } : {} })
}

/**
 * 创建新会话
 */
export function createSession(data?: { title?: string; summary?: string; category?: string }) {
  return request.post<Session>('/sessions', data || {})
}

/**
 * 获取会话详情（包含消息历史）
 */
export function getSessionDetail(sessionId: string) {
  return request.get<{ session: Session; messages: Message[] }>(`/sessions/${sessionId}`)
}

/**
 * 更新会话信息
 */
export function updateSession(sessionId: string, data: { title?: string; summary?: string; category?: string }) {
  return request.post<Session>(`/sessions/${sessionId}`, data)
}

/**
 * 删除会话
 */
export function deleteSession(sessionId: string) {
  return request.delete(`/sessions/${sessionId}`)
}

/**
 * 添加消息到会话
 */
export function addMessage(sessionId: string, role: string, content: string) {
  return request.post<Message>(`/sessions/${sessionId}/messages`, { role, content })
}

/**
 * 获取会话的消息历史
 */
export function getSessionMessages(sessionId: string) {
  return request.get<Message[]>(`/sessions/${sessionId}/messages`)
}

/**
 * 清空会话的所有消息
 */
export function clearSessionMessages(sessionId: string) {
  return request.delete(`/sessions/${sessionId}/messages`)
}
