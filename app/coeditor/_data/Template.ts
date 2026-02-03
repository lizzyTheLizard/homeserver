import { PoolClient } from 'pg'
import { v4 as randomUUID } from 'uuid'
import { logger } from '@/app/shared/logger'
import { invalidInput } from '../../shared/_helper/BackendError'
import { BaseEntity, BaseInput, CountResult, countResultToNumber } from '@/app/shared/_external/db/types'

export interface Template extends BaseEntity {
  id: string
  name: string
  language: string
  text: string
  parameters: TemplateParameter[]
}

export interface TemplateParameter {
  name: string
  type: 'STRING' | 'SELECT' | 'TEXT'
  values?: string[]
  startPosition: number
  endPosition: number
}

export type TemplateInput = Omit<BaseInput<Template>, 'parameters'>

export async function findTemplatesByOwner(client: PoolClient, owner: string): Promise<Template[]> {
  const result = await client.query<Template>(
    'SELECT * FROM template WHERE owner_id = $1',
    [owner],
  )
  if (result.rows.length === 0) {
    logger.info('No templates found, inserting default template')
    return [
      await createOrModifyTemplate(client, owner, { id: randomUUID(), name: 'No Context', language: 'English', text: '' }),
      await createOrModifyTemplate(client, owner, { id: randomUUID(), name: 'With Context', language: 'English', text: '{context:TEXT}' }),
    ]
  }
  logger.debug(`Found ${result.rows.length.toString()} templates for  owner ${owner}`)
  return result.rows
}

export async function findNumberOfUsersWithTemplates(client: PoolClient): Promise<number> {
  const result = await client.query<CountResult>('SELECT COUNT(DISTINCT owner_id) AS count FROM template')
  return countResultToNumber(result)
}

export async function findTemplateById(client: PoolClient, owner: string, id: string): Promise<Template | undefined> {
  const result = await client.query<Template>(
    'SELECT * FROM template WHERE owner_id = $1 AND id=$2',
    [owner, id],
  )
  return result.rows[0]
}

export async function createOrModifyTemplate(client: PoolClient, owner: string, input: TemplateInput): Promise<Template> {
  const parameters = extractParameters(input.text)
  const query = await findTemplateById(client, owner, input.id)
    ? 'UPDATE template SET name = $2, language = $3, text = $4, parameters = $6, updated_at = NOW() WHERE id = $1  AND owner_id = $5 RETURNING *'
    : 'INSERT INTO template (id, name, language, text, owner_id, parameters) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *'
  const result = await client.query<Template>(query, [input.id, input.name, input.language, input.text, owner, JSON.stringify(parameters)])
  if (!result.rows[0]) throw new Error('Failed to modify template')
  logger.info(`Modified template '${input.id}' for owner ${owner}`)
  return result.rows[0]
}

function extractParameters(text: string): TemplateParameter[] {
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
  if (parts.length < 2 || parts.length > 3)
    throw invalidInput(`'{${text}}' is not a valid parameter. It must be in the format 'name:type[:value1,value2,...]'`)
  const name = parts[0]
  const typeString = parts[1]
  const type = typeString.toUpperCase()
  if (type !== 'STRING' && type !== 'SELECT' && type !== 'TEXT')
    throw invalidInput(`'{${text}}' is not valid. It has an invalid type '${typeString}'. Allowed types are: STRING, SELECT, TEXT`)
  const values = parts[2]?.split(',') ?? []
  return { name, type, values }
}

export async function removeTemplate(client: PoolClient, owner: string, template_id: string): Promise<void> {
  // First remove all discussions related to this template
  const result1 = await client.query(
    'DELETE FROM discussion WHERE template_id = $1 AND owner_id = $2',
    [template_id, owner],
  )
  logger.info(`Removed ${(result1.rowCount ?? 0).toString()} discussions for template ${template_id}`)

  const result2 = await client.query(
    'DELETE FROM template WHERE id = $1 AND owner_id = $2',
    [template_id, owner],
  )
  if (result2.rowCount !== 0)
    logger.info(`Deleted template ${template_id} for owner ${owner}`)
  else
    logger.debug(`Try to delete non exising template '${template_id}' for owner ${owner}`)
}
