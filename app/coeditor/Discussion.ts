import type { PoolClient } from 'pg'

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
  const discussion = await client.query<Discussion>('SELECT * FROM discussion WHERE id = $1', [discussion_id])
  if (!discussion.rows[0])
    return undefined
  return discussion.rows[0]
}

export async function findDiscussionByOwner(client: PoolClient, owner: string): Promise<Discussion[]> {
  const discussion = await client.query<Discussion>('SELECT * FROM discussion WHERE owner_id = $1 ORDER BY updated_at DESC', [owner])
  return discussion.rows
}
