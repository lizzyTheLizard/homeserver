'use server'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { findProjectsByOwner } from '../_data/Project'
import { nontransactional } from '@/app/shared/db'

export async function loadProjects() {
  const user = await getAuthenticatedUserSession('cash')
  return nontransactional(c => findProjectsByOwner(c, user.sub))
}
