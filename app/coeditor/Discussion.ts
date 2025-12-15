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
