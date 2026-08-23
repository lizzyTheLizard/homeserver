'use client'
import { Project } from '@/app/cash/_data/Project'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { v4 as randomUUID } from 'uuid'
import { Input } from '@/app/shared/_components/form/Input'
import { Checkbox } from '@/app/shared/_components/form/Checkbox'
import { useState } from 'react'
import { boolColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { deleteProject, saveProject } from '../server'
import { useListState } from '@/app/shared/_helper/ListState'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'

export interface CashProps {
  projects?: Project[]
}

const columns = [
  textColumn('name', { header: 'Name' }),
  textColumn('owner_email', { style: { overflow: 'clip' }, header: 'Owner' }),
  boolColumn('archived', { header: 'Archived' }),
]

export function Cash({ projects: projectsIn = [] }: CashProps) {
  const [id, setId] = useState(randomUUID())
  const [name, setName] = useState('')
  const [archived, setArchived] = useState(false)
  const [owner_email, setOwnerEmail] = useState('')
  const [projects, addProject, removeProject] = useListState<Project>(projectsIn)
  const [title, setTitle] = useState<string>('New Project')
  const [sidebarId, openSidebar] = useSidebar()
  const [noDelete, setNoDelete] = useState(false)

  function showProject(project?: Project) {
    setId(project?.id ?? randomUUID())
    setName(project?.name ?? '')
    setOwnerEmail(project?.owner_email ?? '')
    setArchived(project?.archived ?? false)
    setTitle(project ? project.name : 'New Project')
    setNoDelete(!project)
    openSidebar()
  }

  return (
    <>
      <ActionButton onClick={() => { showProject() }}>Add Project</ActionButton>
      <DataTable
        columns={columns}
        initialSortingOrder={[{ key: 'name', direction: 'ASC' }]}
        data={projects}
        onRowClick={(project) => { showProject(project) }}
      />
      <Sidebar
        id={sidebarId}
        title={title}
        type="Project"
        onSave={() => saveProject({ id, name, owner_email, archived })}
        onAfterSave={addProject}
        onDelete={() => deleteProject(id)}
        onAfterDelete={() => { removeProject(id) }}
        noDelete={noDelete}
      >
        <Input type="text" label="Name" required value={name} onChange={(e) => { setName(e.target.value) }} />
        <Input type="text" label="Owner Email" required value={owner_email} onChange={(e) => { setOwnerEmail(e.target.value) }} />
        <Checkbox label="Archived" checked={archived} onChange={(e) => { setArchived(e.target.checked) }} />
      </Sidebar>
    </>
  )
}
