import OpenAI from 'openai'
import type { Command, CommandResult, CommandWithoutResult, PredefinedCommandType } from './Command.js'
import type { ResponseInputItem } from 'openai/resources/responses/responses.mjs'
import { expectedError, unexpectedError } from '../../BackendError.js'

export async function aiPort(input: CommandWithoutResult, commandsSoFar: Command[]): Promise<CommandResult> {
  const messagesSoFar = commandsSoFar.flatMap(command => mapCommandsSoFar(command))
  const nextMessage = createNextMessage(input)
  const start = performance.now()
  const response = await client.responses.create({
    model: 'gpt-oss-120b',
    input: [systemMessage, ...messagesSoFar, nextMessage],
  })
  const end = performance.now()
  const output = JSON.parse(response.output_text) as { newText: string, newTitle: string, error?: string }
  if (output.error) throw new Error(`AI Port Error: ${output.error}`)
  return { ...output, durationMs: end - start }
}

const client = new OpenAI({ baseURL: 'https://api.scaleway.ai/v1' })

const systemMessage: ResponseInputItem = { role: 'developer', content: `You are an AI editor that helps users to edit text documents.
You can answer questions about the text, execute commands and replace text. You will get your input in the form of a JSON object with the following fields:
- language: The language of the text document, which is used to determine the language model to use.
- profile: The profile of the user, which contains information about the user and their preferences. Might not be given, then just assume a generic profile.
- context: The context of the discussion, which contains the text of the document and other relevant information. Might not be given, then just assume an empty context.
- title: The current title of the document, if any. It is not given, the document has no title.
- text: The whole text of the document so far. If not given, no text is present.
- selection: The selected part of the text that the user wants to edit, if any. It contains the start and end index and the text itself. It not given, edit the whole text.
- command: The command that the user wants to execute. It contains the message of the messagePredefinedCommand.

You will answer with a JSON object with the following fields:
- newText: The text as changed by the command. If a selection has been send, this only has to be the replacement of the selected text.
- newTitle: The new title of the document. The title must be max 256 characters long. For short texts, the title can be the text itself, for longer texts, it should be a summary of the text. If the old title still fits you can keep it
- error: If an error occurred, this field contains the error message. If no error occurred, this field is not present.
You will never change the profile or context of the discussion, only the text. Do not response any other text that this JSON object.` }

function mapCommandsSoFar(command: Command): ResponseInputItem[] {
  const message = {
    language: command.language,
    profile: command.profile,
    context: command.context,
    title: command.title,
    text: command.text,
    selection: getSelection(command),
    command: getCommand(command),
  }
  const response = { newText: command.result.newText, newTitle: command.result.newTitle }

  return [
    { role: 'user', content: JSON.stringify(message) },
    { role: 'assistant', content: JSON.stringify(response) },
  ]
}

function createNextMessage(input: CommandWithoutResult): ResponseInputItem {
  return { role: 'user', content: JSON.stringify({
    language: input.language,
    profile: input.profile,
    context: input.context,
    title: input.title,
    text: input.text,
    selection: getSelection(input),
    command: getCommand(input),
  }) }
}

function getSelection(input: CommandWithoutResult): unknown {
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

const commands: Record<PredefinedCommandType, string> = {
  INITIALIZE: 'I want to create a new text. Create an initial draft based on the profile and the context of the whole text.',
  IMPROVE: 'I want to improve the text based on the profile and the context. Remove any spelling or grammar mistakes, improve the style and the readability of the text. Do not change the meaning of the text.',
  REFORMULATE: 'I want to reformulate the text based on the profile and the context. Do not change the meaning of the text, but make it more concise or more elaborate as needed.',
  SUMMARIZE: 'I want to summarize the text. Make it shorter while keeping the meaning.',
  EXTEND: 'I want to extend the text. Add more information and details to the text.',
}

function getCommand(input: CommandWithoutResult): string {
  if (input.custom_command)
    return input.custom_command
  if (!input.predefined_command)
    throw expectedError('No custom nor predefined command given', 400)
  const command = commands[input.predefined_command]
  if (!command)
    throw unexpectedError(`Unknown predefined command: ${input.predefined_command}`, 500, 'Unknown Predefined Command')
  return command
}
