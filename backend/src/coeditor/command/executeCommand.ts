import type { PoolClient } from 'pg'
import type { Context, UserInfo } from '../../Context.js'
import type { Discussion } from '../discussion/Discussion.js'
import { expectedError } from '../../BackendError.js'
import { createContextString } from '../template/extractParameters.js'
import { validate } from 'uuid'
import type { Template } from '../template/Template.js'

interface CommandInput {
  id: string
  discussionId: string
  currentText: string
  parameters: Record<string, string>
  selectionStart?: number
  selectionEnd?: number
  command?: string
  predefinedCommand?: 'INITIALIZE' | 'IMPROVE' | 'REFORMULATE' | 'SUMMARIZE' | 'EXTEND'
}

export async function executeCommand(context: Context, input: unknown): Promise<Discussion> {
  return context.db.inTransaction<Discussion>(async (client) => {
    if (!validateInput(input)) throw expectedError('Invalid command input', 400, 'Bad Request')
    const existingDiscussion = await getDiscussion(client, input.discussionId)
    const template = await getTemplate(client, context.user, existingDiscussion.template_id)
    const contextString = createContextString(template.text, template.parameters, input.parameters)
    const newText = await getNewText(input, contextString)
    const discussion: Discussion = {
      ...existingDiscussion,
      context: contextString,
      text: newText,
      parameters: input.parameters,
    }
    await client.query('UPDATE discussion SET text = $1, context = $2, parameters = $3 WHERE id = $4', [discussion.text, discussion.context, discussion.parameters, discussion.id])
    await client.query('INSERT INTO command (id, text, context, selectionStart, selectionEnd, command, predefinedCommand) VALUES ($1, $2, $3, $4, $5, $6, $7)', [input.id, input.currentText, contextString, input.selectionStart, input.selectionEnd, 'command' in input ? input.command : null, 'predefinedCommand' in input ? input.predefinedCommand : null])
    return discussion
  })
}

function validateInput(input: unknown): input is CommandInput {
  if (typeof input !== 'object' || input === null) return false
  if (!('id' in input) || typeof input.id !== 'string')
    throw expectedError('ID is required', 400)
  if (!validate(input.id))
    throw expectedError('Invalid ID ' + input.id, 400, 'Invalid ID')
  if (!('discussionId' in input) || typeof input.discussionId !== 'string')
    throw expectedError('Discussion ID is required', 400)
  if (!validate(input.discussionId))
    throw expectedError('Invalid Discussion ID ' + input.discussionId, 400, 'Invalid discussion ID')
  if ('currentText' in input && input.currentText && typeof input.currentText !== 'string')
    throw expectedError('Invalid currentText ' + JSON.stringify(input.currentText), 400, 'Invalid currentText')
  if ('selectionStart' in input && input.selectionStart && typeof input.selectionStart !== 'number')
    throw expectedError('Invalid selectionStart ' + JSON.stringify(input.selectionStart), 400, 'Invalid selectionStart')
  if ('selectionEnd' in input && input.selectionEnd && typeof input.selectionEnd !== 'number')
    throw expectedError('Invalid selectionEnd ' + JSON.stringify(input.selectionEnd), 400, 'Invalid selectionEnd')
  if (!('parameters' in input) || typeof input.parameters !== 'object' || input.parameters === null)
    throw expectedError('Parameters are required', 400)
  if ('command' in input && input.command && typeof input.command !== 'string')
    throw expectedError('Invalid command ' + JSON.stringify(input.command), 400, 'Invalid command')
  if ('command' in input && input.command && typeof input.command === 'string' && input.command.length == 0)
    throw expectedError('Command cannot be empty', 400, 'Invalid command')
  if ('command' in input && input.command)
    return true
  if (!('predefinedCommand' in input && input.predefinedCommand))
    throw expectedError('Either command or predefinedCommand is required', 400)
  if (typeof input.predefinedCommand !== 'string')
    throw expectedError('Invalid predefinedCommand ' + JSON.stringify(input.predefinedCommand), 400, 'Invalid predefinedCommand')
  if (!['INITIALIZE', 'IMPROVE', 'REFORMULATE', 'SUMMARIZE', 'EXTEND'].includes(input.predefinedCommand))
    throw expectedError('Invalid predefinedCommand ' + input.predefinedCommand, 400, 'Invalid predefinedCommand')
  return true
}

async function getDiscussion(client: PoolClient, discussionId: string): Promise<Discussion> {
  const result = await client.query<Discussion>('SELECT * FROM discussion WHERE id = $1', [discussionId])
  if (!result.rows[0]) throw expectedError('Discussion not found', 404, 'Discussion Not Found')
  return result.rows[0]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getNewText(input: CommandInput, _context: string): Promise<string> {
  // TODO: Implement command execution logic here
  // For now, just return the currentText as is
  return Promise.resolve(input.currentText)
}

async function getTemplate(client: PoolClient, user: UserInfo, template_id: string): Promise<Template> {
  const result = await client.query<Template>('SELECT * FROM template WHERE id = $1 AND owner_id = $2', [template_id, user.email])
  if (!result.rows[0]) throw expectedError('Template not found', 404, 'Template Not Found')
  return result.rows[0]
}
