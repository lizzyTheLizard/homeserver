import { generateText, ModelMessage, streamText, ToolChoice, ToolSet } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { config } from '@/app/shared/config'
import { logger } from '@/app/shared/logger'
import { isArray } from 'util'

const MAX_TOOL_ITERATIONS = 5
const opencode = createOpenAICompatible({ name: 'opencode', apiKey: config.AI.API_KEY, baseURL: config.AI.BASE_URL, fetch: loggingFetch })
const model = opencode('deepseek-v4-flash')
const agentSettings = { model, reasoning: 'none' as const, temperature: 0.2, allowSystemInMessages: true, providerOptions: { opencode: { thinking: { type: 'disabled' } } } }

export interface SendOptions {
  messages: ModelMessage[]
  tools?: ToolSet
  onChunk?: (chunk: string) => void
  onToolCall?: () => void
}

export async function send({ messages, tools, onChunk, onToolCall }: SendOptions): Promise<string> {
  const toolChoice = (tools ? 'auto' : 'none') as ToolChoice<ToolSet>
  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    let responseMessages: ModelMessage[]
    let hadToolCall: boolean
    if (onChunk) {
      const result = streamText({ ...agentSettings, messages, tools, toolChoice })
      for await (const chunk of result.textStream)
        onChunk(chunk)
      responseMessages = await result.responseMessages
      hadToolCall = (await result.toolCalls).length > 0
    }
    else {
      const result = await generateText({ ...agentSettings, messages, tools, toolChoice })
      responseMessages = result.responseMessages
      hadToolCall = result.toolCalls.length > 0
    }
    responseMessages.forEach(m => messages.push(m))
    if (!hadToolCall) {
      const lastMessage = responseMessages[responseMessages.length - 1].content
      if (!Array.isArray(lastMessage)) throw new Error('Last message content is not an array')
      if (lastMessage.length === 0) return ''
      const content = lastMessage[0]
      if ('text' in content) return content.text
      throw new Error('Last message content is not text')
    }
    onToolCall?.()
  }
  throw new Error('Too many tool call iterations, stopping after 5')
}

async function loggingFetch(resource: string | URL | Request, init: RequestInit | undefined): Promise<Response> {
  const requestStartTime = Date.now()
  logRequest(init)
  const response = await fetch(resource, init)
  void logResponse(response, requestStartTime)
  return response
}

function logRequest(init: RequestInit | undefined) {
  if (!config.AI.LOG_REQUEST_RESPONSE) return
  const bodyString = init?.body ? String(init.body) : ''// eslint-disable-line @typescript-eslint/no-base-to-string
  const requestSize = bodyString.length
  logger.debug(`LLM request of size ${requestSize.toString()} bytes started`)
  console.log(bodyString)
}

async function logResponse(res: Response, requestStartTime: number) {
  if (!res.ok) {
    logger.warn(`LLM API request failed with status ${res.status.toString()} ${res.statusText}`)
    return
  }
  const reader = res.clone().body?.getReader()
  if (!reader) {
    logger.warn('LLM API response has no readable stream body')
    return
  }
  const decoder = new TextDecoder()
  let responseSize = 0
  let first = true
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    const chunkText = decoder.decode(chunk.value, { stream: true })
    if (!chunkText.startsWith('data:')) first = false
    logResponseChunk(chunkText, first, requestStartTime)
    first = false
    responseSize += chunkText.length
  }
  logResponseEnd(responseSize, requestStartTime)
}

function logResponseChunk(chunkText: string, first: boolean, requestStartTime: number) {
  if (!config.AI.LOG_REQUEST_RESPONSE) return
  if (first) {
    const timeToFirstTokenInS = (Math.round((Date.now() - requestStartTime) / 100) / 10).toString()
    logger.debug(`LLM first response of size ${chunkText.length.toString()} bytes received in ${timeToFirstTokenInS}s`)
  }
  console.log(chunkText)
}

function logResponseEnd(responseSize: number, requestStartTime: number) {
  const timeInS = (Math.round((Date.now() - requestStartTime) / 100) / 10).toString()
  logger.debug(`LLM response of size ${responseSize.toString()} bytes completed in ${timeInS}s`)
}
