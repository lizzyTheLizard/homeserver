import { Command, CommandResult, PredefinedCommandType } from '../_data/Command'
import { config } from '@/app/shared/config'
import { logger } from '@/app/shared/logger'
import { invalidInput } from '@/app/shared/_helper/BackendError'
import { validateObject } from '@/app/shared/_helper/validation'
import { generateText, ModelMessage, Output } from 'ai'
import { createGroq, GroqLanguageModelChatOptions } from '@ai-sdk/groq'
import { z } from 'zod'

const GROQ_MODEL = 'openai/gpt-oss-120b'
const provider = createGroq({ apiKey: config.AI.API_KEY, fetch: loggingFetch })
const model = provider(GROQ_MODEL)
const groqOptions = { reasoningFormat: 'hidden', parallelToolCalls: false, reasoningEffort: 'low' } satisfies GroqLanguageModelChatOptions
const agentSettings = { model, temperature: 0.2, allowSystemInMessages: true, providerOptions: { groq: groqOptions } }

export interface AiPortInput {
  text?: string
  selection_start?: number
  selection_end?: number
  language: string
  profile?: string
  context: string
  title?: string
  custom_command?: string
  predefined_command?: PredefinedCommandType
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function aiPort(input: AiPortInput, commandsSoFar: Command[]): Promise<CommandResult> {
  const messagesSoFar = commandsSoFar.flatMap(command => mapToChatMessages(command))
  const systemMessage = createSystemMessage(input)
  const nextMessage = mapToChatMessages(input)[0]
  const content = await chatCompletion(systemMessage, [...messagesSoFar, nextMessage])
  const output = parseOutput(content)
  if (output.error) throw new Error(`AI Communication Error: ${output.error}`)
  const newText = getFullNewText(input, output.text)
  return { title: output.title, text: newText }
}

function toModelMessage(message: ChatMessage): ModelMessage {
  return message.role === 'assistant'
    ? { role: 'assistant', content: [{ type: 'text', text: message.content }] }
    : message
}

function createSystemMessage(input: AiPortInput): string {
  const context = {
    profile: input.profile ?? 'No profile given',
    context: input.context,
    language: input.language,
  }
  return `You are an AI editor that helps users to edit text documents.
    You can edit texts based on a given profile and context. You will get your input in the form of a JSON object with the following fields:
  - title: The current title of the document, if any. It is not given, the document has no title so far.
  - text: The whole text of the document so far. If not given, no text is present.
  - command: The command that the user wants to execute.
  - selection: The selected part of the text, if any. If not given, all text is selected.

  You then execute the command on the selected text (or the whole text if no selection is given) based on the profile and the context. You will answer with a JSON object with the following fields:
  - text: The text as changed by the command. If a selection has been send, this only has to be the replacement of the selected text. This field has to be present.
  - title: The new title of the document. The title must be max 256 characters long. For short texts, the title can be the text itself, for longer texts, it should be a summary of the text. If the old title still fits you can keep it. This field has to be present.
  - error: If an error occurred, this field contains the error message. If no error occurred, this field is not present.

  Generate the text using the following profile and context:
  ${JSON.stringify(context)}
  `
}

export function mapToChatMessages(input: AiPortInput | Command): ChatMessage[] {
  const selection = input.selection_start !== undefined && input.selection_end !== undefined
    ? input.text?.substring(input.selection_start, input.selection_end)
    : undefined

  if (!input.predefined_command && !input.custom_command) {
    throw invalidInput('Either custom_command or predefined_command must be provided')
  }
  const command = input.custom_command ?? (input.predefined_command ? commands[input.predefined_command] : undefined)
  if (input.predefined_command && !command) {
    throw invalidInput(`Unknown predefined command '${input.predefined_command}'`)
  }

  const message = {
    title: input.title,
    text: input.text,
    selection,
    command,
  }

  if (!('result' in input)) {
    return [{ role: 'user', content: JSON.stringify(message) }]
  }

  const response = { text: input.result.text, title: input.result.title }
  return [
    { role: 'user', content: JSON.stringify(message) },
    { role: 'assistant', content: JSON.stringify(response) },
  ]
}

async function chatCompletion(systemMessage: string, chatMessages: ChatMessage[]): Promise<string> {
  const messages: ModelMessage[] = [
    { role: 'system', content: systemMessage },
    ...chatMessages.map(toModelMessage),
  ]
  const result = await generateText({
    ...agentSettings,
    messages,
    output: Output.json(),
  })
  return result.text
}

export function parseOutput(content: string): z.infer<typeof AiResponseSchema> {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  }
  catch {
    throw new Error(`AI returned non-JSON response: ${content.slice(0, 200)}`)
  }
  return validateObject(parsed, AiResponseSchema)
}

export function getFullNewText(input: AiPortInput, newText: string): string {
  if (input.selection_end === undefined)
    return newText
  if (input.selection_start === undefined)
    return newText
  if (input.text === undefined)
    return newText

  return input.text.substring(0, input.selection_start) + newText + input.text.substring(input.selection_end)
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
  const cloned = res.clone()
  const text = await cloned.text()
  if (config.AI.LOG_REQUEST_RESPONSE) {
    const timeToFirstTokenInS = (Math.round((Date.now() - requestStartTime) / 100) / 10).toString()
    logger.debug(`LLM  response of size ${text.length.toString()} bytes received in ${timeToFirstTokenInS}s`)
    console.log(text)
  }
  const timeInS = (Math.round((Date.now() - requestStartTime) / 100) / 10).toString()
  logger.debug(`LLM response of size ${text.length.toString()} bytes completed in ${timeInS}s`)
}

const commands: Record<PredefinedCommandType, string> = {
  INITIALIZE: 'I want to create a new text. Create an initial draft based on the profile and the context of the whole text.',
  IMPROVE: 'I want to improve the text based on the profile and the context. Remove any spelling or grammar mistakes, improve the style and the readability of the text. Do not change the meaning of the text.',
  REFORMULATE: 'I want to reformulate the text based on the profile and the context. Do not change the meaning of the text, but make it more concise or more elaborate as needed.',
  SUMMARIZE: 'I want to summarize the text. Make it shorter while keeping the meaning.',
  EXTEND: 'I want to extend the text. Add more information and details to the text.',
}

const AiResponseSchema = z.object({
  text: z.string().min(1).describe('The edited text or the replacement for the selected text'),
  title: z.string().min(1).describe('The new title of the document'),
  error: z.string().describe('An optional error message if an error occurred').optional(),
})
