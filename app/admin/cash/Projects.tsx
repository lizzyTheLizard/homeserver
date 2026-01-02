'use client'

import { Project, ProjectInput } from '@/app/cash/Project'
import { DataTable } from '@/app/shared/components/DataTable'
import { DateTime } from '@/app/shared/components/DateTime'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Sidebar, SidebarContainer, SidebarContent } from '@/app/shared/components/Sidebar'
import { Button } from '@/app/shared/components/Button'
import { ActionResponse } from '@/app/shared/ActionResponse'
import { useSidebarState } from '@/app/shared/components/SidebarState'
import { v4 as randomUUID } from 'uuid'
import { Input } from '@/app/shared/components/Input'
import { Checkbox } from '@/app/shared/components/Checkbox'
import { useState } from 'react'
import style from './Projects.module.css'

export interface ProjectsProps {
  projects: Project[]
  onSaveProject: (project: ProjectInput) => ActionResponse<Project>
  onDeleteProject: (id: string) => ActionResponse<void>
}

export function Projects({ projects, onSaveProject, onDeleteProject }: ProjectsProps) {
  const [state, dispatch] = useSidebarState(projects, () => (
    { id: randomUUID(), name: '', archived: false } as ProjectInput
  ))

  function deleteProject(input: ProjectInput) {
    dispatch({ type: 'START_ACTION' })
    onDeleteProject(input.id)
      .then((result) => { dispatch({ type: 'STOP_ACTION', result }) })
      .catch((error: unknown) => { dispatch({ type: 'ACTION_ERROR', error }) })
  }

  function saveProject(input: ProjectInput) {
    dispatch({ type: 'START_ACTION' })
    onSaveProject(input)
      .then((result) => { dispatch({ type: 'STOP_ACTION', result }) })
      .catch((error: unknown) => { dispatch({ type: 'ACTION_ERROR', error }) })
  }

  return (
    <SidebarContainer>
      <SidebarContent onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}>
        {state.pending && <LoadingSpinner text="Processing..." />}
        <DataTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Last Updated</th>
              <th>Owner</th>
              <th>Archived</th>
            </tr>
          </thead>
          <tbody>
            {state.all.map(project => (
              <tr key={project.id} onClick={(e) => { dispatch({ type: 'SHOW_SIDEBAR', item: project }); e.stopPropagation() }} className={style.projectrow}>
                <td>{project.name}</td>
                <td><DateTime hideTime={true} date={project.updated_at} /></td>
                <td>{project.owner_id}</td>
                <td>{project.archived ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <div className={style.createButtonRow + ' row'}>
          <Button className={style.createButton} onClick={(e) => { dispatch({ type: 'SHOW_SIDEBAR' }); e.stopPropagation() }}>Add</Button>
        </div>
      </SidebarContent>
      <Sidebar
        open={state.sidebarOpen}
        type="Project"
        title={state.current.name === '' ? 'New Project' : state.current.name}
        onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}
      >
        <ProjectSidebar
          key={state.current.id}
          project={state.current}
          error={state.error}
          onDelete={deleteProject}
          onSave={saveProject}
          onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}
        />
      </Sidebar>
    </SidebarContainer>
  )
}

interface ProjectSidebarProps {
  project: ProjectInput
  error?: string | undefined
  onSave?: (project: ProjectInput) => void
  onDelete?: (project: ProjectInput) => void
  onClose?: () => void
}

function ProjectSidebar({ project, error, onSave, onDelete, onClose }: ProjectSidebarProps) {
  const [id] = useState(project.id)
  const [name, setName] = useState(project.name)
  const [archived, setArchived] = useState(project.archived)
  const [owner_id, setOwnerId] = useState(project.owner_id)

  return (
    <form className={style.form}>
      <Input type="text" label="Name" required value={name} onChange={(e) => { setName(e.target.value) }} />
      <Input type="text" label="Owner ID" required value={owner_id} onChange={(e) => { setOwnerId(e.target.value) }} />
      <Checkbox label="Archived" checked={archived} onChange={(e) => { setArchived(e.target.checked) }} />
      {error && <div className={style.error}>{error}</div>}
      <Button type="button" variant="primary" onClick={() => onSave?.({ id, name, archived, owner_id })}>Save</Button>
      <Button type="button" variant="danger" onClick={() => onDelete?.({ id, name, archived, owner_id })}>Delete</Button>
      <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
    </form>
  )
}
