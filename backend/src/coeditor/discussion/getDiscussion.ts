import type { PoolClient } from 'pg'
import { expectedError } from '../../BackendError.js'
import type { Context } from '../../Context.js'
import type { Discussion } from './Discussion.js'

export async function getDiscussion(context: Context, discussion_id: string): Promise<Discussion> {
  console.debug(`Fetching discussion ${discussion_id} for ${context.user.email}`)
  return context.db.inTransaction<Discussion>(async (client) => {
    const discussion = await findDiscussionById(client, discussion_id)
    if (!discussion)
      throw expectedError(`Discussion '${discussion_id}' not found`, 404, 'Discussion not found')
    if (discussion.owner_id !== context.user.email)
      throw expectedError('You do not have permission to read this discussion', 403)
    return discussion
  })
}

export async function getMyDiscussions(context: Context): Promise<Discussion[]> {
  console.debug(`Fetching discussions for ${context.user.email}`)
  return context.db.inTransaction<Discussion[]>(async (client) => {
    return await findDiscussionByOwner(client, context.user.email)
  })
}

export async function findDiscussionById(client: PoolClient, discussion_id: string): Promise<Discussion | undefined> {
  const discussion = await client.query<Discussion>('SELECT * FROM discussion WHERE id = $1', [discussion_id])
  if (!discussion.rows[0])
    return undefined
  return discussion.rows[0]
}

export async function findDiscussionByOwner(client: PoolClient, owner: string): Promise<Discussion[]> {
  const discussion = await client.query<Discussion>('SELECT * FROM discussion WHERE owner_id = $1', [owner])
  return discussion.rows
}
