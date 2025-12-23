import { PoolClient } from 'pg'
import { v4 as randomUUID } from 'uuid'
import { expectedError } from '../BackendError'
import { logger } from '@/logger'

export interface Template {
  id: string
  name: string
  language: string
  text: string
  owner_id: string
  created_at: Date
  updated_at: Date
  parameters: TemplateParameter[]
}

export interface TemplateParameter {
  name: string
  type: 'STRING' | 'SELECT' | 'TEXT'
  values?: string[]
  startPosition: number
  endPosition: number
}

export interface TemplateInput {
  id: string
  name: string
  language: string
  text: string
}

export async function findTemplatesByOwner(client: PoolClient, owner: string): Promise<Template[]> {
  const result = await client.query<Template>('SELECT * FROM template WHERE owner_id = $1', [owner])
  if (result.rows.length === 0) {
    logger.info('No templates found, inserting default template')
    return [
      await createTemplate(client, owner, { id: randomUUID(), name: 'No Context', language: 'English', text: '' }),
      await createTemplate(client, owner, { id: randomUUID(), name: 'With Context', language: 'English', text: '{context:TEXT}' }),
    ]
  }
  logger.debug(`Found ${result.rows.length.toString()} templates for  owner ${owner}`)
  return result.rows
}

export async function findTemplateById(client: PoolClient, template_id: string): Promise<Template | undefined> {
  const result = await client.query<Template>('SELECT * FROM template WHERE id = $1', [template_id])
  logger.debug(`${result.rows.length ? 'Found' : 'Did not find'} template ${template_id}`)
  return result.rows[0] ?? undefined
}

export async function findNumberOfUsersWithTemplates(client: PoolClient): Promise<number> {
  const result = await client.query<{ count: string }>('SELECT COUNT(DISTINCT owner_id) AS count FROM template')
  return parseInt(result.rows[0].count, 10)
}

export async function createTemplate(client: PoolClient, owner: string, input: TemplateInput): Promise<Template> {
  const parameters = extractParameters(input.text)
  const result = await client.query<Template>(
    'INSERT INTO template (id, name, language, text, owner_id, parameters) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [input.id, input.name, input.language, input.text, owner, JSON.stringify(parameters)],
  )
  if (!result.rows[0]) throw expectedError('Failed to create template', 500, 'Internal Server Error')
  logger.info(`Created template ${input.id} for owner ${owner}`)
  return result.rows[0]
}

export async function modifyTemplate(client: PoolClient, input: TemplateInput): Promise<Template> {
  const parameters = extractParameters(input.text)
  const result = await client.query<Template>(
    'UPDATE template SET name = $1, language = $2, text = $3, parameters = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
    [input.name, input.language, input.text, JSON.stringify(parameters), input.id],
  )
  if (!result.rows[0]) throw expectedError('Failed to modify template', 500, 'Internal Server Error')
  logger.info(`Modified template ${input.id}`)
  return result.rows[0]
}

export async function removeTemplate(client: PoolClient, owner: string, template_id: string): Promise<void> {
  {
    const result = await client.query(
      'DELETE FROM template WHERE id = $1 AND owner_id = $2',
      [template_id, owner],
    )
    if (result.rowCount === 0) throw expectedError('Failed to delete template', 500, 'Internal Server Error')
    logger.info(`Deleted template ${template_id} for owner ${owner}`)
  }
}

export function extractParameters(text: string): TemplateParameter[] {
  const PARAMETER_REGEX = /\{([^}]+)\}/g
  return Array.from(text.matchAll(PARAMETER_REGEX)).map((match) => {
    const matchedString = match[1]
    const paramterDetails = getParameterDetails(matchedString)
    const matchedLength = matchedString.length + 2 // +2 for the curly braces
    return { ...paramterDetails, startPosition: match.index, endPosition: match.index + matchedLength }
  })
}

function getParameterDetails(text: string): { name: string, type: 'STRING' | 'SELECT' | 'TEXT', values?: string[] } {
  const parts: string[] = text.split(':')
  if (parts.length < 2 || parts.length > 3) {
    const message = `'{${text}}' is not a valid parameter. It must be in the format 'name:type[:value1,value2,...]'`
    throw new Error(message)
  }

  const name = parts[0]
  const typeString = parts[1]
  const type = typeString.toUpperCase()
  if (type !== 'STRING' && type !== 'SELECT' && type !== 'TEXT') {
    const message = `'{${text}}' is not valid. It has an invalid type '${typeString}'. Allowed types are: STRING, SELECT, TEXT`
    throw new Error(message)
  }
  const values = parts[2]?.split(',') ?? []
  return { name, type, values }
}

export function createContextString(template: Template, values: Record<string, string>): string {
  let result = template.text
  let offset = 0
  for (const param of template.parameters) {
    if (!(param.name in values))
      throw new Error(`Missing parameter '${param.name}'`)
    const value = values[param.name]
    result = result.substring(0, param.startPosition + offset) + value + result.substring(param.endPosition + offset)
    offset += value.length - (param.endPosition - param.startPosition)
  }
  return result
}
