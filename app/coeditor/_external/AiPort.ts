import OpenAI from 'openai'
import { invalidInput, unexpectedError } from '@/app/shared/_helper/BackendError'
import { Command, CommandResult, PredefinedCommandType } from '../_data/Command'
import { logger } from '@/app/shared/logger'
import { ClientOptions } from 'openai'
import { validateObject } from '@/app/shared/_helper/validation'
import { ChatCompletionMessageParam, ResponseFormatJSONSchema } from 'openai/resources'
import { config } from '@/app/shared/config'

export interface TextAndSelection {
  text?: string
  selection_start?: number
  selection_end?: number
}

export interface AiPortInput extends TextAndSelection {
  language: string
  profile?: string
  context: string
  title?: string
  custom_command?: string
  predefined_command?: PredefinedCommandType
}

export async function aiPort(input: AiPortInput, commandsSoFar: Command[], opts?: ClientOptions): Promise<CommandResult> {
  const messagesSoFar = commandsSoFar.flatMap(command => mapCommandsSoFar(command))
  const nextMessage = createNextMessage(input)
  logger.debug(`AI called with message: ${JSON.stringify(JSON.parse(nextMessage.content as string), null, 2)}`)
  const start = performance.now()
  const client = new OpenAI({ ...opts, baseURL: config.AI.BASE_URL, apiKey: config.AI.API_KEY })
  const completion = await client.chat.completions.create({
    model: config.AI.MODEL,
    messages: [systemMessage, ...messagesSoFar, nextMessage],
    response_format: responseFormat,
  })
  const end = performance.now()
  const output = JSON.parse(completion.choices[0].message.content ?? '') as { text: string, title: string, error?: string }
  validateObject(output, responseFormatConstraint)
  logger.debug(`AI Port call took ${((end - start) / 1000).toString()} seconds`)
  logger.debug(`AI response : ${JSON.stringify(output, null, 2)}`)
  if (output.error) throw unexpectedError(`AI Port error: ${output.error}`, 'AI Port Error')
  const newText = getFullNewText(input, output.text)
  return { title: output.title, text: newText, durationMs: end - start }
}

const systemMessage: ChatCompletionMessageParam = { role: 'developer', content: `You are an AI editor that helps users to edit text documents.
You can answer questions about the text, execute commands and replace text. You will get your input in the form of a JSON object with the following fields:
- language: The language of the text document, which is used to determine the language model to use.
- profile: The profile of the user, which contains information about the user and their preferences. Might not be given, then just assume a generic profile.
- context: The context of the discussion, which contains the text of the document and other relevant information. Might not be given, then just assume an empty context.
- title: The current title of the document, if any. It is not given, the document has no title.
  - text: The whole text of the document so far. If not given, no text is present.
- selection: The selected part of the text that the user wants to edit, if any. It contains the start and end index and the text itself. It not given, edit the whole text.
- command: The command that the user wants to execute. It contains the message of the messagePredefinedCommand.

You will answer with a JSON object with the following fields:
  - text: The text as changed by the command. If a selection has been send, this only has to be the replacement of the selected text. This field has to be present.
  - title: The new title of the document. The title must be max 256 characters long. For short texts, the title can be the text itself, for longer texts, it should be a summary of the text. If the old title still fits you can keep it. This field has to be present.
  - error: If an error occurred, this field contains the error message. If no error occurred, this field is not present.
You will never change the profile or context of the discussion, only the text. Do not response any other text that this JSON object.` }

function mapCommandsSoFar(command: Command): ChatCompletionMessageParam[] {
  const message = {
    language: command.language,
    profile: command.profile,
    context: command.context,
    title: command.title,
    text: command.text,
    selection: getSelection(command),
    command: getCommand(command.custom_command, command.predefined_command),
  }
  const response = { text: command.result.text, title: command.result.title }

  return [
    { role: 'user', content: JSON.stringify(message) },
    { role: 'assistant', content: JSON.stringify(response) },
  ]
}

function createNextMessage(input: AiPortInput): ChatCompletionMessageParam {
  return { role: 'user', content: JSON.stringify({
    language: input.language,
    profile: input.profile,
    context: input.context,
    title: input.title,
    text: input.text,
    selection: getSelection(input),
    command: getCommand(input.custom_command, input.predefined_command),
  }) }
}

function getSelection(input: TextAndSelection): unknown {
  if (input.selection_end === undefined)
    return undefined
  if (input.selection_start === undefined)
    return undefined
  if (input.text === undefined)
    return undefined
  return {
    start: input.selection_start,
    end: input.selection_end,
    text: input.text.substring(input.selection_start, input.selection_end),
  }
}

function getFullNewText(input: TextAndSelection, newText: string): string {
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

function getCommand(custom_command: string | undefined, predefined_command: PredefinedCommandType | undefined): string {
  if (custom_command)
    return custom_command
  if (!predefined_command) {
    logger.info('No custom nor predefined command given')
    throw invalidInput('No custom nor predefined command given')
  }
  const command = commands[predefined_command]
  if (!command) {
    logger.info(`Unknown predefined command: ${predefined_command}`)
    throw invalidInput(`Unknown predefined command '${predefined_command}'`)
  }
  return command
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
