'use server'
import { createOrModifyProject, findAllProjects, ProjectInput, removeProject } from '@/app/cash/_data/Project'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { toResponse } from '@/app/shared/_helper/ActionResponse'
import { nontransactional, transactional } from '@/app/shared/db'

export async function loadProjects() {
  await getAuthenticatedUserSession('admin')
  return nontransactional(c => findAllProjects(c))
}

export async function saveProject(project: ProjectInput) {
  return toResponse(transactional(async (tx) => {
    await getAuthenticatedUserSession('admin')
    return createOrModifyProject(tx, project)
  }))
}

export async function deleteProject(project: ProjectInput) {
  return toResponse(transactional(async (tx) => {
    await getAuthenticatedUserSession('admin')
    return removeProject(tx, project.id)
  }))
}
