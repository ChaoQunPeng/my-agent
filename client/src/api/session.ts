import request from '@/utils/request'

export interface Session {
  sessionId: string
  title: string
  summary: string
  category?: string
  novelCode?: string
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
 * @param novelCode 可选的小说代码筛选条件
 */
export function getSessions(category?: string, novelCode?: string) {
  const params: any = {};
  if (category) {
    params.category = category;
  }
  if (novelCode) {
    params.novelCode = novelCode;
  }
  return request.post<Session[]>('/sessions/list', params)
}

/**
 * 创建新会话
 */
export function createSession(data?: { title?: string; summary?: string; category?: string; novelCode?: string }) {
  return request.post<Session>('/sessions/create', data || {})
}

/**
 * 获取会话详情（包含消息历史）
 */
export function getSessionDetail(sessionId: string) {
  return request.post<{ session: Session; messages: Message[] }>('/sessions/detail', { id: sessionId })
}

/**
 * 更新会话信息
 */
export function updateSession(sessionId: string, data: { title?: string; summary?: string; category?: string }) {
  return request.post<Session>('/sessions/update', { id: sessionId, ...data })
}

/**
 * 删除会话
 */
export function deleteSession(sessionId: string) {
  return request.post('/sessions/delete', { id: sessionId })
}

/**
 * 添加消息到会话
 */
export function addMessage(sessionId: string, role: string, content: string) {
  return request.post<Message>('/sessions/add-message', { id: sessionId, role, content })
}

/**
 * 获取会话的消息历史
 */
export function getSessionMessages(sessionId: string) {
  return request.post<Message[]>('/sessions/get-message-history', { id: sessionId })
}

/**
 * 清空会话的所有消息
 */
export function clearSessionMessages(sessionId: string) {
  return request.post('/sessions/clear-messages', { id: sessionId })
}
