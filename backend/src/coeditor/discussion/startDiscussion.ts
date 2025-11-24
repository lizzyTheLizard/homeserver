import type { PoolClient } from 'pg'
import type { Context } from '../../Context.js'
import type { Discussion } from './Discussion.js'
import { expectedError } from '../../BackendError.js'
import { createContextString } from '../template/extractParameters.js'
import type { Template } from '../template/Template.js'
import { validate } from 'validate.js'
import { DiscussionInputConstraints, type DiscussionInput } from './DicsussionInput.js'

export async function startDiscussion(context: Context, input: unknown): Promise<Discussion> {
  console.debug(`Starting discussion for ${context.user.email}`)
  if (!validateInput(input)) throw expectedError('Invalid discussion input', 400, 'Bad Request')

  return context.db.inTransaction<Discussion>(async (client) => {
    // Create the context string from the template and parameters
    const template = await findTemplateById(client, input.template_id)
    if (!template)
      throw expectedError('Template not found', 404, 'Template Not Found')
    if (template.owner_id !== context.user.email)
      throw expectedError('You do not have permission to use this template', 403)
    const contextString = createContextString(template.text, template.parameters, input.parameters)

    // Update or create the discussion
    const existingDiscussion = await findDiscussionById(client, input.id)
    if (existingDiscussion && existingDiscussion.owner_id !== context.user.email)
      throw expectedError('Discussion with ID \'' + input.id + '\' already exists for another user', 400, 'Discussion Exists')
    if (existingDiscussion)
      return await updateDiscussion(client, input, contextString, context.user.email)
    return await createDiscussion(client, input, contextString, context.user.email)
  })
}

function validateInput(input: unknown): input is DiscussionInput {
  const result = validate(input, DiscussionInputConstraints, { format: 'flat' }) as string[] | undefined
  if (!result?.[0]) return true
  throw expectedError(result[0], 400)
}

async function findTemplateById(client: PoolClient, id: string): Promise<Template | undefined> {
  const result = await client.query<Template>('SELECT * FROM template WHERE id = $1', [id])
  if (!result.rows[0])
    return undefined
  return result.rows[0]
}

async function findDiscussionById(client: PoolClient, id: string): Promise<Discussion | undefined> {
  const result = await client.query<Discussion>('SELECT * FROM discussion WHERE id = $1', [id])
  if (!result.rows[0])
    return undefined
  return result.rows[0]
}

async function updateDiscussion(client: PoolClient, input: DiscussionInput, contextString: string, owner: string): Promise<Discussion> {
  const result = await client.query<Discussion>(
    'UPDATE discussion SET text = $2, owner_id = $3, template_id = $4, context = $5, parameters = $6, updated_at = NOW() WHERE id = $1 RETURNING *',
    [input.id, input.text, owner, input.template_id, contextString, JSON.stringify(input.parameters)],
  )
  if (!result.rows[0]) throw expectedError('Failed to create discussion', 500, 'Internal Server Error')
  return result.rows[0]
}

async function createDiscussion(client: PoolClient, input: DiscussionInput, contextString: string, owner: string): Promise<Discussion> {
  const result = await client.query<Discussion>(
    'INSERT INTO discussion (id, text, title, owner_id, template_id, context, parameters) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [input.id, input.text, 'New Discussion', owner, input.template_id, contextString, JSON.stringify(input.parameters)],
  )
  if (!result.rows[0]) throw expectedError('Failed to create discussion', 500, 'Internal Server Error')
  return result.rows[0]
}
