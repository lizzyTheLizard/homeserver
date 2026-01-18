import OpenAI from 'openai'
import { invalidInput } from '@/app/shared/_helper/BackendError'
import { Command, CommandResult, PredefinedCommandType } from '../_data/Command'
import { logger } from '@/app/shared/logger'
import { ClientOptions } from 'openai'
import { validateObject } from '@/app/shared/_helper/validation'
import { ChatCompletionMessageParam, ResponseFormatJSONSchema } from 'openai/resources'
import { config } from '@/app/shared/config'

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

export async function aiPort(input: AiPortInput, commandsSoFar: Command[], opts?: ClientOptions): Promise<CommandResult> {
  const messagesSoFar = commandsSoFar.flatMap(command => mapToChatMessages(command))
  const systemMessage = createSystemMessage(input)
  const nextMessage = mapToChatMessages(input)[0]
  logger.debug(`AI called with message: ${JSON.stringify(JSON.parse(nextMessage.content as string), null, 2)}`)
  const start = performance.now()
  const client = new OpenAI({ ...opts, baseURL: config.AI.BASE_URL, apiKey: config.AI.API_KEY })
  const completion = await client.chat.completions.create({
    model: config.AI.MODEL,
    messages: [systemMessage, ...messagesSoFar, nextMessage],
    response_format: responseFormat,
  })
  const end = performance.now()
  logger.debug(`AI Port call took ${((end - start) / 1000).toString()} seconds`)
  const output = JSON.parse(completion.choices[0].message.content ?? '') as { text: string, title: string, error?: string }
  validateObject(output, responseFormatConstraint)
  logger.debug(`AI Port call took ${((end - start) / 1000).toString()} seconds`)
  logger.debug(`AI response : ${JSON.stringify(output, null, 2)}`)
  if (output.error) throw new Error('AI Communication Error', { cause: output.error })
  const newText = getFullNewText(input, output.text)
  return { title: output.title, text: newText, durationMs: end - start }
}

function createSystemMessage(input: AiPortInput): ChatCompletionMessageParam {
  const context = {
    profile: input.profile ?? 'No profile given',
    context: input.context,
    language: input.language,
  }
  return { role: 'system', content: `You are an AI editor that helps users to edit text documents. 
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
  ` }
}

function mapToChatMessages(input: AiPortInput | Command): ChatCompletionMessageParam[] {
  const selection = input.selection_start !== undefined && input.selection_end !== undefined
    ? input.text?.substring(input.selection_start, input.selection_end)
    : undefined

  if (!input.predefined_command && !input.custom_command) {
    logger.info('No command provided in input')
    throw invalidInput('Either custom_command or predefined_command must be provided')
  }
  const command = input.custom_command ?? (input.predefined_command ? commands[input.predefined_command] : undefined)
  if (input.predefined_command && !command) {
    logger.info(`Unknown predefined command: ${input.predefined_command}`)
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

function getFullNewText(input: AiPortInput, newText: string): string {
  if (input.selection_end === undefined)
    return newText
  if (input.selection_start === undefined)
    return newText
  if (input.text === undefined)
    return newText

  return input.text.substring(0, input.selection_start) + newText + input.text.substring(input.selection_end)
}

const commands: Record<PredefinedCommandType, string> = {
  INITIALIZE: 'I want to create a new text. Create an initial draft based on the profile and the context of the whole text.',
  IMPROVE: 'I want to improve the text based on the profile and the context. Remove any spelling or grammar mistakes, improve the style and the readability of the text. Do not change the meaning of the text.',
  REFORMULATE: 'I want to reformulate the text based on the profile and the context. Do not change the meaning of the text, but make it more concise or more elaborate as needed.',
  SUMMARIZE: 'I want to summarize the text. Make it shorter while keeping the meaning.',
  EXTEND: 'I want to extend the text. Add more information and details to the text.',
}

const responseFormat: ResponseFormatJSONSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'CoEditor Response Schema',
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The edited text or the replacement for the selected text' },
        title: { type: 'string', description: 'The new title of the document' },
        error: { type: 'string', description: 'An optional error message if an error occurred' },
      },
      required: ['text', 'title'],
    },
  },
}

const responseFormatConstraint = {
  text: {
    presence: { allowEmpty: false },
    type: 'string',
  },
  title: {
    presence: { allowEmpty: false },
    type: 'string',
  },
}
