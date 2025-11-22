import type { PoolClient } from 'pg'
import type { Context, UserInfo } from '../../Context.js'
import type { Discussion } from './Discussion.js'
import { expectedError } from '../../BackendError.js'
import { validate } from 'uuid'
import { createContextString } from '../template/extractParameters.js'
import type { Template } from '../template/Template.js'

interface DiscussionInput {
  id: string
  text?: string
  templateId: string
  parameters: Record<string, string>
}

export async function startDiscussion(context: Context, input: unknown): Promise<Discussion> {
  return context.db.inTransaction<Discussion>(async (client) => {
    if (!validateInput(input)) throw expectedError('Invalid discussion input', 400, 'Bad Request')
    if (await getDiscussion(client, input.id)) throw expectedError('Discussion already exists', 409, 'Conflict')
    const template = await getTemplate(client, context.user, input.templateId)
    const contextString = createContextString(template.text, template.parameters, input.parameters)
    const discussion = {
      ...input,
      text: input.text ?? '',
      title: 'New Discussion',
      owner_id: context.user.email,
      startTime: new Date(),
      context: contextString,
    }
    await client.query('INSERT INTO discussion (id, text, title, owner_id, template_id, start_time, context, parameters) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [discussion.id, discussion.text, discussion.title, discussion.owner_id, discussion.template_id, discussion.start_time, discussion.context, discussion.parameters])
    return discussion
  })
}

function validateInput(input: unknown): input is DiscussionInput {
  if (typeof input !== 'object' || input === null) return false
  if (!('id' in input) || typeof input.id !== 'string')
    throw expectedError('ID is required', 400)
  if (!validate(input.id))
    throw expectedError('Invalid ID ' + input.id, 400, 'Invalid ID')
  if ('text' in input && input.text && typeof input.text !== 'string')
    throw expectedError('Invalid text ' + JSON.stringify(input.text), 400, 'Invalid Text')
  if (!('templateId' in input) || typeof input.templateId !== 'string')
    throw expectedError('Template ID is required', 400)
  if (!validate(input.templateId))
    throw expectedError('Invalid template id ' + input.templateId, 400, 'Invalid ID')
  if (!('parameters' in input) || typeof input.parameters !== 'object' || input.parameters === null)
    throw expectedError('Parameters are required', 400)
  return true
}

async function getDiscussion(client: PoolClient, discussionId: string): Promise<Discussion | undefined> {
  const result = await client.query<Discussion>('SELECT * FROM discussion WHERE id = $1', [discussionId])
  if (result.rowCount === 0) return undefined
  return result.rows[0]
}

async function getTemplate(client: PoolClient, user: UserInfo, templateId: string): Promise<Template> {
  const result = await client.query<Template>('SELECT * FROM template WHERE id = $1 AND owner_id = $2', [templateId, user.email])
  if (!result.rows[0]) throw expectedError('Template not found', 404, 'Template Not Found')
  return result.rows[0]
}
