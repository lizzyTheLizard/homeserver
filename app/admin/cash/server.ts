'use server'
import { createOrModifyProject, findAllProjects, ProjectInput, removeProjectAsAdmin } from '@/app/cash/_data/Project'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { toResponse } from '@/app/shared/_helper/ActionResponse'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { logger } from '@/app/shared/logger'
import { logEvent } from '@/app/shared/_data/Event'

export async function loadProjects() {
  await getAuthenticatedUserSession('admin')
  return nontransactional(c => findAllProjects(c))
}

export async function saveProject(project: ProjectInput) {
  return toResponse(transactional(async (tx) => {
    await getAuthenticatedUserSession('admin')
    const result = await createOrModifyProject(tx, project)
    logger.info(`Saved project ${project.name} for user ${project.owner_email} with id ${project.id}`)
    await logEvent(tx, 'INFO', `Saved project ${project.name} for user ${project.owner_email}`)
    return result
  }))
}

export async function deleteProject(id: string) {
  return toResponse(transactional(async (tx) => {
    await getAuthenticatedUserSession('admin')
    const result = await removeProjectAsAdmin(tx, id)
    if (!result) {
      logger.info(`Project with id ${id} not found for deletion`)
      return result
    }
    logger.info(`Deleted project ${result.name} for user ${result.owner_email} with id ${id}`)
    await logEvent(tx, 'INFO', `Deleted project ${result.name} for user ${result.owner_email}`)
  }))
}
