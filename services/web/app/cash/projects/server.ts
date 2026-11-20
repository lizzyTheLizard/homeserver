'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { findProjectsByOwner } from '../_data/Project'
import { nontransactional } from '@/app/shared/_external/db/access'

export async function loadProjects() {
  const user = await getAuthenticatedUserSession('cash')
  return nontransactional(c => findProjectsByOwner(c, user.email))
}
