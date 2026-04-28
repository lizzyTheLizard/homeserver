'use server'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional } from '@/app/shared/_external/db/access'
import { Discussion, findDiscussionByOwner } from '../_data/Discussion'

export async function loadHistory(): Promise<Discussion[]> {
  const user = await getAuthenticatedUserSession('coeditor')
  const discussions = await nontransactional(c => findDiscussionByOwner(c, user.email))
  return discussions
}
