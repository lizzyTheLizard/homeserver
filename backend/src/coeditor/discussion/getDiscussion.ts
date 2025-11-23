import type { PoolClient } from 'pg'
import { expectedError } from '../../BackendError.js'
import type { Context } from '../../Context.js'
import type { Discussion } from './Discussion.js'

export async function getDiscussion(context: Context, discussionId: string): Promise<Discussion> {
  console.debug(`Fetching discussion ${discussionId} for ${context.user.email}`)
  return context.db.inTransaction<Discussion>(async (client) => {
    const discussion = await findDiscussionById(client, discussionId)
    if (!discussion)
      throw expectedError(`Discussion '${discussionId}' not found`, 404, 'Discussion not found')
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

async function findDiscussionById(client: PoolClient, discussionId: string): Promise<Discussion | undefined> {
  const discussion = await client.query<Discussion>('SELECT * FROM discussion WHERE id = $1', [discussionId])
  if (!discussion.rows[0])
    return undefined
  return discussion.rows[0]
}

async function findDiscussionByOwner(client: PoolClient, owner: string): Promise<Discussion[]> {
  const discussion = await client.query<Discussion>('SELECT * FROM discussion WHERE owner_id = $1', [owner])
  return discussion.rows
}
