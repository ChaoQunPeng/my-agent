import { fetchEventSource } from '@microsoft/fetch-event-source'

const BASE_PREFIX = import.meta.env.VITE_APP_BASE_API_DEV ?? ''

export interface ChatStreamOptions {
  message: string
  sessionId?: string
  scene?: string
  characterId?: string
  onChunk: (content: string) => void | Promise<void>
  onError?: (error: Error) => void
  onComplete?: () => void
  signal?: AbortSignal
}

/**
 * 流式对话接口(SSE) - 使用 @microsoft/fetch-event-source
 * 通过 POST 请求发送消息，接收 SSE 流式响应
 * @param options.message 用户消息
 * @param options.sessionId 可选的会话ID
 * @param options.scene 可选的场景标识（如 "digital"、"writing"）
 * @param options.characterId 可选的角色ID，用于动态构建 System Prompt
 */
export async function chatStreamApi(options: ChatStreamOptions): Promise<void> {
  const { message, sessionId, scene, characterId, onChunk, onError, onComplete, signal } = options

  // 构建请求体
  const body: Record<string, string> = { message }
  if (sessionId) body.sessionId = sessionId
  if (scene) body.scene = scene
  if (characterId) body.characterId = characterId

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
 * @param options.characterId 可选的角色ID，用于动态构建 System Prompt
 * @param options.onChunk 接收每个数据块的回调函数
 * @param options.onError 错误处理回调函数
 * @param options.onComplete 完成时的回调函数
 * @param options.signal 可选的中断信号，用于取消请求
 */
export async function chatStreamNoRecordApi(options: any): Promise<void> {
  const { message, systemPrompt, onChunk, onError, onComplete, signal } = options

  // 构建请求体（不包含 sessionId 和 scene）
  const body: Record<string, string> = { message }
  if (systemPrompt) body.systemPrompt = systemPrompt

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
