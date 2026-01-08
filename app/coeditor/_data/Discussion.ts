import type { PoolClient } from 'pg'
import { logger } from '@/app/shared/logger'

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

export async function findDiscussionById(client: PoolClient, owner: string, discussion_id: string): Promise<Discussion | undefined> {
  const result = await client.query<Discussion>('SELECT * FROM discussion WHERE id = $1 and owner_id = $2', [discussion_id, owner])
  logger.debug(`${result.rows.length ? 'Found' : 'Did not find'} discussion ${discussion_id}`)
  return result.rows[0]
}

export async function findDiscussionByOwner(client: PoolClient, owner: string): Promise<Discussion[]> {
  const result = await client.query<Discussion>('SELECT * FROM discussion WHERE owner_id = $1 ORDER BY updated_at DESC', [owner])
  logger.debug(`Found ${result.rows.length.toString()} discussions for owner ${owner}`)
  return result.rows
}

export async function findNumberOfDiscussions(client: PoolClient, since?: Date): Promise<number> {
  if (since === undefined) {
    const result = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM discussion')
    return parseInt(result.rows[0].count, 10)
  }
  const result = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM discussion WHERE updated_at > $1', [since])
  return parseInt(result.rows[0].count, 10)
}
