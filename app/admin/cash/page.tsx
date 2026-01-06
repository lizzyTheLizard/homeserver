import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, transactional } from '@/app/shared/db'
import { createOrModifyProject, findAllProjects, ProjectInput, removeProject } from '@/app/cash/Project'
import { Projects } from './Projects'
import { toResponse } from '@/app/shared/ActionResponse'

export const metadata: Metadata = {
  title: 'Admin - Cash',
}

export default async function Page() {
  await getAuthenticatedUserSession('admin')
  const projects = await nontransactional(c => findAllProjects(c))

  return (
    <Projects projects={projects} onDeleteProject={deleteProject} onSaveProject={saveProject} />
  )
}

async function saveProject(project: ProjectInput) {
  'use server'
  return toResponse(transactional(tx => createOrModifyProject(tx, project)))
}

async function deleteProject(project: ProjectInput) {
  'use server'
  return toResponse(transactional(tx => removeProject(tx, project.id)))
}
