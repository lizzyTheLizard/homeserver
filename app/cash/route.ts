import { logger } from '@/logger'
import { getAuthenticatedUserSession } from '../common/auth/auth'
import { nontransactional } from '../shared/db'
import { findProjectsByOwner } from './Project'
import { redirect } from 'next/navigation'

export async function GET() {
  const user = await getAuthenticatedUserSession('cash')
  const projects = await nontransactional(c => findProjectsByOwner(c, user.sub))

  if (projects.length === 1) {
    logger.debug(`User ${user.sub} has only one project, redirecting to it`)
    const project = projects[0]
    return redirect(`/cash/${project.id}/LATEST/journal`)
  }
  logger.debug(`User ${user.sub} has ${projects.length.toString()} projects, redirecting to project list`)
  return redirect('/cash/projects')
}
