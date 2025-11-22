import { expectedError } from '../../BackendError.js'
import type { Context } from '../../Context.js'
import type { Discussion } from './Discussion.js'

export async function getDiscussion(context: Context, discussionId: string): Promise<Discussion> {
  return context.db.inTransaction<Discussion>(async (client) => {
    console.debug(`Fetching discussion ${discussionId} for ${context.user.email}`)
    const discussion = await client.query<Discussion>('SELECT * FROM discussion WHERE id = $1', [discussionId])
    if (discussion.rowCount === 0)
      throw expectedError(`Discussion ${discussionId} not found`, 404, 'Discussion not found')
    if (discussion.rows[0]?.owner_d !== context.user.email)
      throw expectedError('You do not have permission to get this discussion', 403)
    return discussion.rows[0]
  })
}

export async function getMyDiscussions(context: Context): Promise<Discussion[]> {
  return context.db.inTransaction<Discussion[]>(async (client) => {
    console.debug(`Fetching discussions for ${context.user.email}`)
    const discussions = await client.query<Discussion>('SELECT * FROM discussion WHERE owner_id = $1', [context.user.email])
    return discussions.rows.map(row => ({ ...row }))
  })
}
