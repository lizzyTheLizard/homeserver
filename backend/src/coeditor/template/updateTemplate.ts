import type { PoolClient } from 'pg'
import { extractParameters } from './extractParameters.js'
import type { Context, UserInfo } from '../../Context.js'
import type { Template } from './Template.js'
import { expectedError } from '../../BackendError.js'
import { validate } from 'uuid'

interface TemplateInput {
  id: string
  name: string
  language: string
  text: string
}

export async function updateTemplate(context: Context, body: unknown): Promise<Template> {
  if (!validateInput(body)) throw expectedError('Invalid template input', 400, 'Bad Request')
  return context.db.inTransaction(async (client) => {
    const existingTemplateOwner = await getTemplateOwner(client, body.id)
    if (existingTemplateOwner && existingTemplateOwner !== context.user.email)
      throw expectedError('You do not have permission to modify this template', 403)
    if (!existingTemplateOwner) return await createTemplate(client, context.user, body)
    else return modifyTemplate(client, context.user, body)
  })
}

function validateInput(input: unknown): input is TemplateInput {
  if (typeof input !== 'object' || input === null) return false
  if (!('id' in input) || typeof input.id !== 'string')
    throw expectedError('ID is required', 400)
  if (!validate(input.id))
    throw expectedError('Invalid ID \'' + input.id + '\'', 400, 'Invalid ID')
  if (!('name' in input) || typeof input.name !== 'string' || input.name.trim().length === 0)
    throw expectedError('Name is required', 400)
  if (!('language' in input) || typeof input.language !== 'string' || input.language.trim().length === 0)
    throw expectedError('Language is required', 400)
  if (!('text' in input) || typeof input.text !== 'string' || input.text.trim().length === 0)
    throw expectedError('Text is required', 400)
  return true
}

async function getTemplateOwner(client: PoolClient, templateId: string): Promise<string | undefined> {
  const result = await client.query<{ owner_id: string }>('SELECT owner_id FROM template WHERE id = $1', [templateId])
  if (result.rowCount === 0) return undefined
  return result.rows[0]?.owner_id
}

async function createTemplate(client: PoolClient, user: UserInfo, input: TemplateInput): Promise<Template> {
  console.debug(`Creating template ${input.id} for ${user.email}`)
  const parameters = extractParameters(input.text)
  const template: Template = { ...input, owner_id: user.email, parameters }
  await client.query(
    'INSERT INTO template (id, name, language, text, owner_id, parameters) VALUES ($1, $2, $3, $4, $5, $6)',
    [template.id, template.name, template.language, template.text, user.email, parameters],
  )
  return template
}

async function modifyTemplate(client: PoolClient, user: UserInfo, input: TemplateInput): Promise<Template> {
  console.debug(`Modifying template ${input.id} for ${user.email}`)
  const parameters = extractParameters(input.text)
  const template: Template = { ...input, owner_id: user.email, parameters }
  await client.query(
    'UPDATE template SET name = $1, language = $2, text = $3, parameters = $4 WHERE id = $5',
    [template.name, template.language, template.text, parameters, template.id],
  )
  return template
}
