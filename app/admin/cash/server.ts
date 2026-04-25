'use server'
import { createOrModifyProject, findAllProjects, ProjectInput, removeProject } from '@/app/cash/_data/Project'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { toResponse } from '@/app/shared/_helper/ActionResponse'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { logger } from '@/app/shared/logger'

export async function loadProjects() {
  await getAuthenticatedUserSession('admin')
  return nontransactional(c => findAllProjects(c))
}

export async function saveProject(project: ProjectInput) {
  return toResponse(transactional(async (tx) => {
    await getAuthenticatedUserSession('admin')
    const result = await createOrModifyProject(tx, project)
    logger.info(`Saved project ${project.name} for user ${project.owner_id} with id ${project.id}`)
    return result
  }))
}

export async function deleteProject(id: string) {
  return toResponse(transactional(async (tx) => {
    await getAuthenticatedUserSession('admin')
    const result = await removeProject(tx, id)
    if (!result) logger.info(`Project with id ${id} not found for deletion`)
    else logger.info(`Deleted project ${result.name} for user ${result.owner_id} with id ${id}`)
    return result
  }))
}
