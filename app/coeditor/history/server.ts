'use server'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional } from '@/app/shared/db'
import { Discussion, findDiscussionByOwner } from '../Discussion'

export async function loadHistory(): Promise<Discussion[]> {
  const user = await getAuthenticatedUserSession()
  const discussions = await nontransactional(c => findDiscussionByOwner(c, user.sub))
  return discussions
}
