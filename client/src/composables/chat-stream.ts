const BASE_PREFIX = import.meta.env.VITE_APP_BASE_API_DEV ?? ''

export interface ChatStreamOptions {
  message: string
  onChunk: (content: string) => void
  signal?: AbortSignal
}

/**
 * 流式对话接口（SSE）
 * 通过 Vite 代理转发至后端 NestJS /chatStream
 */
export async function chatStreamApi(options: ChatStreamOptions): Promise<void> {
  const { message, onChunk, signal } = options

  const response = await fetch(
    `${BASE_PREFIX}/chatStream?message=${encodeURIComponent(message)}`,
    {
      headers: { Accept: 'text/event-stream' },
      signal,
    },
  )

  if (!response.ok || !response.body) {
    throw new Error(`请求失败: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // SSE 每条消息以 \n\n 分隔
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      for (const line of part.split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const parsed = JSON.parse(line.slice(6).trim())
          if (parsed.content) onChunk(parsed.content)
        } catch {
          // 忽略非 JSON 行（如心跳）
        }
      }
    }
  }
}

