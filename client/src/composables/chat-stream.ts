import { fetchEventSource } from '@microsoft/fetch-event-source'

const BASE_PREFIX = import.meta.env.VITE_APP_BASE_API_DEV ?? ''

/**
 * 流式对话选项接口
 */
export interface ChatStreamOptions {
  message: string // 用户消息
  sessionId?: string // 可选的会话ID
  type?: string // 可选的资源类型（'character' | 'novel'），用于动态构建 System Prompt
  resourceId?: string // 可选的资源ID，对应type类型的资源ID
  onChunk: (content: string) => void | Promise<void> // 接收每个数据块的回调函数
  onError?: (error: Error) => void // 错误处理回调函数
  onComplete?: () => void // 完成时的回调函数
  signal?: AbortSignal // 可选的中断信号，用于取消请求
}

/**
 * 流式对话接口(SSE) - 使用 @microsoft/fetch-event-source
 * 通过 POST 请求发送消息，接收 SSE 流式响应
 * @param options.message 用户消息
 * @param options.sessionId 可选的会话ID
 * @param options.scene 可选的场景标识（如 "digital"、"writing"）
 * @param options.type 可选的资源类型（'character' | 'novel'），用于动态构建 System Prompt
 * @param options.resourceId 可选的资源ID，对应type类型的资源ID
 * @param options.onChunk 接收每个数据块的回调函数
 * @param options.onError 错误处理回调函数
 * @param options.onComplete 完成时的回调函数
 * @param options.signal 可选的中断信号，用于取消请求
 */
export async function chatStreamApi(options: ChatStreamOptions): Promise<void> {
  const { message, sessionId, type, resourceId, onChunk, onError, onComplete, signal } = options

  // 构建请求体
  const body: Record<string, string> = { message, type, resourceId }
  if (sessionId) body.sessionId = sessionId
  if (type) body.type = type

  await fetchEventSource(`${BASE_PREFIX}/chat/stream-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal,

    onopen: async response => {
      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`请求失败 (${response.status}): ${errorText || response.statusText}`)
      }
    },

    onmessage: ev => {
      // 检查是否是结束标记
      if (ev.data === '[DONE]') {
        return
      }

      try {
        const jsonData = JSON.parse(ev.data)

        // 支持多种数据格式
        if (jsonData.content) {
          onChunk(jsonData.content)
        } else if (jsonData.data) {
          onChunk(jsonData.data)
        } else if (typeof jsonData === 'string') {
          onChunk(jsonData)
        }
      } catch {
        // 如果不是 JSON，直接作为文本处理
        if (ev.data) {
          onChunk(ev.data)
        }
      }
    },

    onclose: () => {
      onComplete?.()
    },

    onerror: err => {
      // 如果是 AbortError，直接抛出让外部处理
      if (err instanceof Error && err.name === 'AbortError') {
        throw err
      }

      const error = err instanceof Error ? err : new Error(`SSE 连接错误: ${String(err)}`)
      onError?.(error)

      // 抛出错误以阻止 fetchEventSource 自动重试
      throw error
    }
  })
}

/**
 * 不保存记录的流式对话接口(SSE) - 使用 @microsoft/fetch-event-source
 * 通过 POST 请求发送消息，接收 SSE 流式响应，不会保存任何消息记录
 * @param options.message 用户消息
 * @param options.systemPrompt 可选的系统提示词
 * @param options.temperature 可选的温度参数 (0-2)
 * @param options.onChunk 接收每个数据块的回调函数
 * @param options.onError 错误处理回调函数
 * @param options.onComplete 完成时的回调函数
 * @param options.signal 可选的中断信号，用于取消请求
 */
export async function chatStreamNoRecordApi(options: any): Promise<void> {
  const { message, systemPrompt, temperature, onChunk, onError, onComplete, signal } = options

  // 构建请求体（不包含 sessionId 和 scene）
  const body: Record<string, any> = { message }
  if (systemPrompt) body.systemPrompt = systemPrompt
  if (temperature !== undefined) body.temperature = temperature

  await fetchEventSource(`${BASE_PREFIX}/chat/stream-message-no-record`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal,

    onopen: async response => {
      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`请求失败 (${response.status}): ${errorText || response.statusText}`)
      }
    },

    onmessage: ev => {
      // 检查是否是结束标记
      if (ev.data === '[DONE]') {
        return
      }

      try {
        const jsonData = JSON.parse(ev.data)

        // 支持多种数据格式
        if (jsonData.content) {
          onChunk(jsonData.content)
        } else if (jsonData.data) {
          onChunk(jsonData.data)
        } else if (typeof jsonData === 'string') {
          onChunk(jsonData)
        }
      } catch {
        // 如果不是 JSON，直接作为文本处理
        if (ev.data) {
          onChunk(ev.data)
        }
      }
    },

    onclose: () => {
      onComplete?.()
    },

    onerror: err => {
      // 如果是 AbortError，直接抛出让外部处理
      if (err instanceof Error && err.name === 'AbortError') {
        throw err
      }

      const error = err instanceof Error ? err : new Error(`SSE 连接错误: ${String(err)}`)
      onError?.(error)

      // 抛出错误以阻止 fetchEventSource 自动重试
      throw error
    }
  })
}
