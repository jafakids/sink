import { destr } from 'destr'

export interface AiChatResponse {
  // Some Workers AI models (e.g. Llama 3.3) hand back JSON already parsed, not as text.
  response?: unknown
  choices?: { message?: { content?: unknown } }[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stripCodeFence(content: string): string {
  const trimmed = content.trim()
  if (!trimmed.startsWith('```') || !trimmed.endsWith('```')) {
    return trimmed
  }

  const lines = trimmed.split('\n')
  const firstLine = lines[0]?.trim()
  if (lines.length < 2 || (firstLine !== '```' && firstLine !== '```json')) {
    return trimmed
  }

  lines.shift()
  lines.pop()
  return lines.join('\n').trim()
}

export function parseAiResponse(response: AiChatResponse): Record<string, unknown> {
  const content = response?.response ?? response?.choices?.[0]?.message?.content ?? ''
  if (isRecord(content))
    return content
  if (typeof content !== 'string' || !content.trim())
    return {}

  // A model's thinking, a code fence or words around the JSON: the JSON object inside.
  const text = stripCodeFence(content.replace(/<think>[\s\S]*?<\/think>/g, ''))
  const parsed = destr(text)
  if (isRecord(parsed))
    return parsed
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const inner = destr(text.slice(start, end + 1))
    if (isRecord(inner))
      return inner
  }

  console.warn('[ai] The model\'s answer had no JSON in it; using the fallback.', text.slice(0, 200))
  return {}
}
