import { generateText, isStepCount, ModelMessage, streamText, ToolSet } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { config } from '@/app/shared/config'
import { logger } from '@/app/shared/logger'

const MAX_TOOL_ITERATIONS = 10
const opencode = createOpenAICompatible({ name: 'opencode', apiKey: config.AI.API_KEY, baseURL: config.AI.BASE_URL, fetch: loggingFetch })
const model = opencode('deepseek-v4-pro')
const agentSettings = { model, reasoning: 'none' as const, temperature: 0.2, allowSystemInMessages: true, providerOptions: { opencode: { thinking: { type: 'disabled' } } } }

export interface SendOptions {
  messages: ModelMessage[]
  tools?: ToolSet
  onChunk?: (chunk: string) => void
  onToolCall?: () => void
}

export async function send(options: SendOptions): Promise<string> {
  const responseMessages = options.onChunk ? await stream(options) : await generate(options)
  responseMessages.forEach(m => options.messages.push(m))
  const lastMessage = responseMessages[responseMessages.length - 1].content
  if (!Array.isArray(lastMessage)) throw new Error('Last message content is not an array')
  if (lastMessage.length === 0) return ''
  const content = lastMessage[0]
  if ('text' in content) return content.text
  throw new Error('Last message content is not text')
}

async function stream(options: SendOptions): Promise<ModelMessage[]> {
  const config = getConfig(options)
  const result = streamText(config)
  for await (const chunk of result.textStream) options.onChunk?.(chunk)
  return await result.responseMessages
}

async function generate(options: SendOptions): Promise<ModelMessage[]> {
  const config = getConfig(options)
  const result = await generateText(config)
  return result.responseMessages
}

function getConfig({ messages, tools, onToolCall }: SendOptions): Parameters<typeof generateText>[0] {
  return {
    ...agentSettings,
    messages,
    tools,
    toolChoice: tools ? 'auto' : 'none',
    stopWhen: isStepCount(MAX_TOOL_ITERATIONS),
    onStepEnd: ({ toolCalls }) => { if (toolCalls.length > 0) onToolCall?.() },
    onToolExecutionStart: ({ toolCall }) => { logger.debug(`Tool execution started: ${toolCall.toolName}`) },
    onToolExecutionEnd: ({ toolCall }) => { logger.debug(`Tool execution ended: ${toolCall.toolName}`) },
  } satisfies Parameters<typeof generateText>[0]
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
