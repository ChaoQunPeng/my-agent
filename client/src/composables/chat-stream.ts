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

export interface SSEMessage {
  data?: string
  event?: string
  id?: string
  retry?: number
}

/**
 * 解析 SSE 消息行
 */
function parseSSELine(line: string): Partial<SSEMessage> {
  if (!line.startsWith('data: ') && line !== 'data:') {
    return {}
  }

  const content = line.slice(6)

  // 检查是否是结束标记
  if (content === '[DONE]') {
    return { data: '[DONE]' }
  }

  return { data: content }
}

/**
 * 流式对话接口(SSE)
 * 通过 Vite 代理转发至后端 NestJS /chat/stream-message
 * @param options.message 用户消息
 * @param options.sessionId 可选的会话ID
 * @param options.scene 可选的场景标识（如 "digital"、"writing"）
 * @param options.characterId 可选的角色ID，用于动态构建 System Prompt
 */
export async function chatStreamApi(options: ChatStreamOptions): Promise<void> {
  const { message, sessionId, scene, characterId, onChunk, onError, onComplete, signal } = options

  // 构建查询参数
  const queryParams = new URLSearchParams()
  queryParams.append('message', message)
  if (sessionId) {
    queryParams.append('sessionId', sessionId)
  }
  if (scene) {
    queryParams.append('scene', scene)
  }
  if (characterId) {
    queryParams.append('characterId', characterId)
  }

  let response: Response

  try {
    response = await fetch(`${BASE_PREFIX}/chat/stream-message?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      signal
    })
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error
    }
    const err = new Error(`网络连接失败: ${error.message}`)
    onError?.(err)
    throw err
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    const err = new Error(`请求失败 (${response.status}): ${errorText || response.statusText}`)
    onError?.(err)
    throw err
  }

  if (!response.body) {
    const err = new Error('响应体为空')
    onError?.(err)
    throw err
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let hasReceivedData = false

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // 处理剩余的 buffer
        if (buffer.trim()) {
          processBuffer(buffer, onChunk)
        }
        break
      }

      hasReceivedData = true
      buffer += decoder.decode(value, { stream: true })

      // SSE 每条消息以 \n\n 分隔
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const shouldStop = processBuffer(part, onChunk)
        if (shouldStop) {
          return
        }
      }
    }

    onComplete?.()
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error
    }

    const err = new Error(`读取数据失败: ${error.message}`)
    onError?.(err)
    throw err
  } finally {
    reader.releaseLock()
  }
}

/**
 * 处理 buffer 中的数据
 * @returns 是否应该停止处理
 */
function processBuffer(buffer: string, onChunk: (content: string) => void | Promise<void>): boolean {
  const lines = buffer.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    const parsed = parseSSELine(trimmedLine)

    if (!parsed.data) continue

    // 检查是否是结束标记
    if (parsed.data === '[DONE]') {
      return true
    }

    try {
      // 尝试解析 JSON
      const jsonData = JSON.parse(parsed.data)

      // 支持多种数据格式
      if (jsonData.data) {
        onChunk(jsonData.data)
      } else if (jsonData.content) {
        onChunk(jsonData.content)
      } else if (typeof jsonData === 'string') {
        onChunk(jsonData)
      }
    } catch (e) {
      // 如果不是 JSON，直接作为文本处理
      onChunk(parsed.data)
    }
  }

  return false
}
