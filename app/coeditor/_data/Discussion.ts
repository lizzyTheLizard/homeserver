import type { PoolClient } from 'pg'
import { logger } from '@/app/shared/logger'
import { BaseEntity, BaseInput, BaseRow, CountResult, countResultToNumber, mapRowToType, mapRowToTypeOptional } from '@/app/shared/_helper/DB'

export interface Discussion extends BaseEntity {
  id: string
  text: string
  title: string
  template_id: string
  context: string
  parameters: Record<string, string>
}

export type DiscussionInput = BaseInput<Discussion>

export async function findDiscussionById(client: PoolClient, owner: string, discussion_id: string): Promise<Discussion | undefined> {
  const result = await client.query<BaseRow<Discussion>>(
    'SELECT * FROM discussion WHERE id = $1 and owner_id = $2',
    [discussion_id, owner],
  )
  logger.debug(`${result.rows.length ? 'Found' : 'Did not find'} discussion ${discussion_id}`)
  return mapRowToTypeOptional(result.rows[0])
}

export async function findDiscussionByOwner(client: PoolClient, owner: string): Promise<Discussion[]> {
  const result = await client.query<BaseRow<Discussion>>(
    'SELECT * FROM discussion WHERE owner_id = $1 ORDER BY updated_at DESC',
    [owner],
  )
  logger.debug(`Found ${result.rows.length.toString()} discussions for owner ${owner}`)
  return result.rows.map(row => mapRowToType(row))
}

export async function findNumberOfDiscussions(client: PoolClient, since?: string): Promise<number> {
  if (since === undefined) {
    const result = await client.query<CountResult>('SELECT COUNT(*) AS count FROM discussion')
    return countResultToNumber(result)
  }
  const result = await client.query<CountResult>('SELECT COUNT(*) AS count FROM discussion WHERE updated_at > $1', [since])
  return countResultToNumber(result)
}

export async function createDiscussion(client: PoolClient, owner: string, input: DiscussionInput): Promise<Discussion> {
  const result = await client.query<BaseRow<Discussion>>(
    'INSERT INTO discussion (id, text, title, owner_id, template_id, context, parameters) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [input.id, input.text, input.title, owner, input.template_id, input.context, JSON.stringify(input.parameters)],
  )
  if (!result.rows[0]) throw new Error('Failed to create discussion')
  logger.info(`Started new discussion ${result.rows[0].id} for owner ${owner}`)
  return mapRowToType(result.rows[0])
}

export async function modifyDiscussion(client: PoolClient, owner: string, input: DiscussionInput): Promise<Discussion> {
  const result = await client.query<BaseRow<Discussion>>('UPDATE discussion SET text = $2, title = $3, template_id = $4, context = $5, parameters = $6, updated_at = NOW() WHERE id = $1 AND owner_id = $7 RETURNING *',
    [input.id, input.text, input.title, input.template_id, input.context, JSON.stringify(input.parameters), owner])
  if (!result.rows[0]) throw new Error('Failed to modify discussion')
  logger.info(`Modified discussion ${result.rows[0].id} for owner ${owner}`)
  return mapRowToType(result.rows[0])
}
