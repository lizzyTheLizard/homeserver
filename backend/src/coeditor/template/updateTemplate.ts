import type { PoolClient } from 'pg'
import { extractParameters } from './extractParameters.js'
import type { Context, UserInfo } from '../../Context.js'
import type { Template } from './Template.js'
import { expectedError } from '../../BackendError.js'
import { validate } from 'validate.js'
import { TemplateInputConstraints, type TemplateInput } from './TemplateInput.js'

export async function updateTemplate(context: Context, body: unknown): Promise<Template> {
  console.debug(`Updating template for ${context.user.email}`)
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
  const result = validate(input, TemplateInputConstraints, { format: 'flat' }) as string[] | undefined
  if (!result?.[0]) return true
  throw expectedError(result[0], 400)
}

async function getTemplateOwner(client: PoolClient, template_id: string): Promise<string | undefined> {
  const result = await client.query<{ owner_id: string }>('SELECT owner_id FROM template WHERE id = $1', [template_id])
  if (!result.rows[0]) return undefined
  return result.rows[0].owner_id
}

async function createTemplate(client: PoolClient, user: UserInfo, input: TemplateInput): Promise<Template> {
  const parameters = extractParameters(input.text)
  const result = await client.query<Template>(
    'INSERT INTO template (id, name, language, text, owner_id, parameters) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [input.id, input.name, input.language, input.text, user.email, parameters],
  )
  if (!result.rows[0]) throw expectedError('Failed to create template', 500, 'Internal Server Error')
  return result.rows[0]
}

async function modifyTemplate(client: PoolClient, user: UserInfo, input: TemplateInput): Promise<Template> {
  const parameters = extractParameters(input.text)
  const result = await client.query<Template>(
    'UPDATE template SET name = $1, language = $2, text = $3, parameters = $4 WHERE id = $5 RETURNING *',
    [input.name, input.language, input.text, parameters, input.id],
  )
  if (!result.rows[0]) throw expectedError('Failed to modify template', 500, 'Internal Server Error')
  return result.rows[0]
}
