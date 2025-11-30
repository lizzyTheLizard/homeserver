import type { PoolClient } from 'pg'
import { extractParameters } from './extractParameters.js'
import type { Context, UserInfo } from '../../Context.js'
import type { Template } from './Template.js'
import { expectedError } from '../../BackendError.js'
import { validate } from 'validate.js'
import { TemplateInputConstraints, type TemplateInput } from './TemplateInput.js'
import { findTemplateById } from './getTemplates.js'

export async function updateTemplate(context: Context, body: unknown): Promise<Template> {
  console.debug(`Updating template for ${context.user.email}`)
  if (!validateInput(body)) throw expectedError('Invalid template input', 400, 'Bad Request')

  return context.db.inTransaction(async (client) => {
    const existingTemplate = await findTemplateById(client, body.id)
    if (existingTemplate && existingTemplate.owner_id !== context.user.email)
      throw expectedError('You do not have permission to modify this template', 403)
    if (!existingTemplate) return await createTemplate(client, context.user, body)
    else return modifyTemplate(client, context.user, body)
  })
}

function validateInput(input: unknown): input is TemplateInput {
  const result = validate(input, TemplateInputConstraints, { format: 'flat' }) as string[] | undefined
  if (!result?.[0]) return true
  throw expectedError(result[0], 400)
}

export async function createTemplate(client: PoolClient, user: UserInfo, input: TemplateInput): Promise<Template> {
  const parameters = extractParameters(input.text)
  const result = await client.query<Template>(
    'INSERT INTO template (id, name, language, text, owner_id, parameters) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [input.id, input.name, input.language, input.text, user.email, JSON.stringify(parameters)],
  )
  if (!result.rows[0]) throw expectedError('Failed to create template', 500, 'Internal Server Error')
  return result.rows[0]
}

async function modifyTemplate(client: PoolClient, user: UserInfo, input: TemplateInput): Promise<Template> {
  const parameters = extractParameters(input.text)
  const result = await client.query<Template>(
    'UPDATE template SET name = $1, language = $2, text = $3, parameters = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
    [input.name, input.language, input.text, parameters, input.id],
  )
  if (!result.rows[0]) throw expectedError('Failed to modify template', 500, 'Internal Server Error')
  return result.rows[0]
}
