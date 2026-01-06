'use client'

import { Project, ProjectInput } from '@/app/cash/Project'
import { DataTable } from '@/app/shared/components/table/DataTable'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Sidebar, SidebarContent, SidebarMain } from '@/app/shared/components/sidebar/Sidebar'
import { Button } from '@/app/shared/components/form/Button'
import { ActionResponse } from '@/app/shared/ActionResponse'
import { sidebarAction, useSidebarState } from '@/app/shared/components/sidebar/SidebarState'
import { v4 as randomUUID } from 'uuid'
import { Input } from '@/app/shared/components/form/Input'
import { Checkbox } from '@/app/shared/components/form/Checkbox'
import { useState } from 'react'
import style from './Projects.module.css'
import { boolColumn, textColumn } from '@/app/shared/components/table/DataTableColumnBuilders'

export interface ProjectsProps {
  projects?: Project[]
  onSaveProject?: (project: ProjectInput) => ActionResponse<Project>
  onDeleteProject?: (project: ProjectInput) => ActionResponse<void>
}

const columns = [
  textColumn('name', { header: 'Name' }),
  textColumn('owner_id', { style: { overflow: 'clip' }, header: 'Owner' }),
  boolColumn('archived', { header: 'Archived' }),
]
export function Projects({ projects, onSaveProject, onDeleteProject }: ProjectsProps) {
  const [state, dispatch] = useSidebarState(projects ?? [], () => (
    { id: randomUUID(), name: '', archived: false } as ProjectInput
  ))

  return (
    <SidebarMain>
      <SidebarContent onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}>
        {state.pending && <LoadingSpinner text="Processing..." />}
        <h1>Cash Admin</h1>
        <DataTable
          columns={columns}
          initialSortingOrder={[{ key: 'name', direction: 'ASC' }]}
          data={state.all}
          onRowClick={(e, project) => { dispatch({ type: 'SHOW_SIDEBAR', item: project }); e.stopPropagation() }}
        />
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
          onDelete={sidebarAction(dispatch, onDeleteProject)}
          onSave={sidebarAction(dispatch, onSaveProject)}
          onClose={() => { dispatch({ type: 'CLOSE_SIDEBAR' }) }}
        />
      </Sidebar>
    </SidebarMain>
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
