import type { PoolClient } from 'pg'
import { logger } from '@/logger'

export interface Discussion {
  id: string
  text: string
  title: string
  owner_id: string
  template_id: string
  created_at: string
  updated_at: string
  context: string
  parameters: Record<string, string>
}

export interface DiscussionInput {
  id: string
  text: string
  title: string
  template_id: string
  context: string
  parameters: Record<string, string>
}

export async function findDiscussionById(client: PoolClient, discussion_id: string): Promise<Discussion | undefined> {
  const result = await client.query<Discussion>('SELECT * FROM discussion WHERE id = $1', [discussion_id])
  logger.debug(`${result.rows.length ? 'Found' : 'Did not find'} discussion ${discussion_id}`)
  return result.rows[0]
}

export async function findDiscussionByOwner(client: PoolClient, owner: string): Promise<Discussion[]> {
  const result = await client.query<Discussion>('SELECT * FROM discussion WHERE owner_id = $1 ORDER BY updated_at DESC', [owner])
  logger.debug(`Found ${result.rows.length.toString()} discussions for owner ${owner}`)
  return result.rows
}

export async function startDiscussion(client: PoolClient, owner: string, input: DiscussionInput): Promise<Discussion> {
  const result = await client.query<Discussion>('INSERT INTO discussion (id, text, title, owner_id, template_id, context, parameters) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [input.id, input.text, input.title, owner, input.template_id, input.context, JSON.stringify(input.parameters)])
  logger.info(`Started new discussion ${result.rows[0].id} for owner ${owner}`)
  return result.rows[0]
}

export async function modifyDiscussion(client: PoolClient, owner: string, input: DiscussionInput): Promise<Discussion> {
  const result = await client.query<Discussion>('UPDATE discussion SET text = $2, title = $3, template_id = $4, context = $5, parameters = $6, updated_at = NOW() WHERE id = $1  RETURNING *',
    [input.id, input.text, input.title, input.template_id, input.context, JSON.stringify(input.parameters)])
  logger.info(`Modified discussion ${result.rows[0].id} for owner ${owner}`)
  return result.rows[0]
}
