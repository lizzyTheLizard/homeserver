import type { PoolClient } from 'pg'
import type { Context, UserInfo } from '../Context.js'
import { expectedError } from '../BackendError.js'
import { validate } from 'uuid'

export interface Template {
  id: string
  name: string
  language: string
  text: string
  owner_id: string
  parameters: TemplateParameter[]
}

export interface TemplateInput {
  id: string
  name: string
  language: string
  text: string
}

interface TemplateDBRow {
  id: string
  name: string
  language: string
  text: string
  owner_id: string
}

export interface TemplateParameter {
  name: string
  type: 'STRING' | 'SELECT' | 'TEXT'
  values?: string[]
  startPosition: number
  endPosition: number
}

export async function getMyTemplates(context: Context): Promise<Template[]> {
  return context.db.inTransaction<Template[]>(async (client) => {
    console.debug('Fetching user templates')
    const templates = await client.query<TemplateDBRow>('SELECT * FROM template WHERE owner_id = $1', [context.user.email])
    return templates.rows.map(row => ({ ...row, parameters: extractParameters(row.text) }))
  })
}

export async function updateTemplate(context: Context, body: TemplateInput): Promise<Template> {
  validateInput(body)
  return context.db.inTransaction(async (client) => {
    const existingTemplate = await getTemplate(client, body.id)
    if (existingTemplate && existingTemplate.owner_id !== context.user.email)
      throw expectedError('You do not have permission to modify this template', 403)
    if (!existingTemplate) return await createTemplate(client, context.user, body)
    else return modifyTemplate(client, context.user, body)
  })
}

function validateInput(template: TemplateInput) {
  if (!template.id || !validate(template.id))
    throw expectedError('Invalid template ID ' + template.id, 400, 'Invalid template ID')
  if (!template.name || template.name.trim().length === 0)
    throw expectedError('Template name is required', 400, 'Template name is required')
  if (!template.language || template.language.trim().length === 0)
    throw expectedError('Template language is required', 400, 'Template language is required')
  if (!template.text || template.text.trim().length === 0)
    throw expectedError('Template text is required', 400, 'Template text is required')
}

async function getTemplate(client: PoolClient, templateId: string): Promise<Template | undefined> {
  const result = await client.query<TemplateDBRow>('SELECT * FROM template WHERE id = $1', [templateId])
  if (result.rowCount === 0) return undefined
  return result.rows.map(row => ({ ...row, parameters: extractParameters(row.text) }))[0]
}

async function createTemplate(client: PoolClient, user: UserInfo, template: TemplateInput): Promise<Template> {
  await client.query(
    'INSERT INTO template (id, name, language, text, owner_id) VALUES ($1, $2, $3, $4, $5)',
    [template.id, template.name, template.language, template.text, user.email],
  )
  const parameters = extractParameters(template.text)
  return { ...template, owner_id: user.email, parameters }
}

async function modifyTemplate(client: PoolClient, user: UserInfo, template: TemplateInput): Promise<Template> {
  await client.query(
    'UPDATE template SET name = $1, language = $2, text = $3 WHERE id = $4',
    [template.name, template.language, template.text, template.id],
  )
  const parameters = extractParameters(template.text)
  return { ...template, owner_id: user.email, parameters }
}

export function extractParameters(text: string): TemplateParameter[] {
  const result: TemplateParameter[] = []
  for (const match of text.matchAll((/\{([^}]+)\}/g))) {
    const matchedString = match[1] ?? ''
    const parts = matchedString.split(':')
    if (parts.length < 2 || parts.length > 3) {
      const message = `'{${match[0]}}' is not valid. It must be in the format {name:type[:value1,value2,...]}`
      throw expectedError(message, 400, 'Invalid parameter format')
    }
    const name = parts[0] ?? ''
    const typeString = parts[1] ?? ''
    const type = typeString.toUpperCase()
    if (type !== 'STRING' && type !== 'SELECT' && type !== 'TEXT') {
      const message = `'{${matchedString}}' is not valid. It has an invalid type '${typeString}'. Allowed types are: STRING, SELECT, TEXT`
      throw expectedError(message, 400, 'Invalid parameter format')
    }
    const values = parts.length > 2 ? parts[2]?.split(',') : undefined
    const matchedLength = matchedString.length + 2 // +2 for the curly braces
    const parameter: TemplateParameter = { name, type, values, startPosition: match.index, endPosition: match.index + matchedLength }
    result.push(parameter)
  }
  return result
}
