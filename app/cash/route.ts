import { logger } from '@/logger'
import { redirect } from 'next/navigation'
import { loadProjects } from './projects/server'

export async function GET() {
  const projects = await loadProjects()
  if (projects.length === 1) {
    logger.debug(`User has only one project, redirecting to it`)
    const project = projects[0]
    return redirect(`/cash/${project.id}/LATEST/journal`)
  }
  logger.debug(`User has ${projects.length.toString()} projects, redirecting to project list`)
  return redirect('/cash/projects')
}
