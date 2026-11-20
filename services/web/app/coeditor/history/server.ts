'use server'
import { type Discussion, findDiscussionByOwner } from '../_data/Discussion';
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { nontransactional } from '@/app/shared/_external/db/access'

export async function loadHistory(): Promise<Discussion[]> {
  const user = await getAuthenticatedUserSession('coeditor'),
   discussions = await nontransactional(c => findDiscussionByOwner(c, user.email))
  return discussions
}
