'use client'
import { Project } from '@/app/cash/_data/Project'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { v4 as randomUUID } from 'uuid'
import { Input } from '@/app/shared/_components/form/Input'
import { Checkbox } from '@/app/shared/_components/form/Checkbox'
import { useState } from 'react'
import { boolColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { deleteProject, saveProject } from '../server'
import { useListState } from '@/app/shared/_helper/ListState'
import { useSidebarState } from '@/app/shared/_components/sidebar/SidebarState'
import { ActionButton } from '@/app/shared/_components/ActionButton'

export interface CashProps {
  projects?: Project[]
}

const columns = [
  textColumn('name', { header: 'Name' }),
  textColumn('owner_id', { style: { overflow: 'clip' }, header: 'Owner' }),
  boolColumn('archived', { header: 'Archived' }),
]

export function Cash({ projects: projectsIn = [] }: CashProps) {
  const [id, setId] = useState(randomUUID())
  const [name, setName] = useState('')
  const [archived, setArchived] = useState(false)
  const [owner_id, setOwnerId] = useState('')
  const [projects, addProject, removeProject] = useListState<Project>(projectsIn)
  const [sidebarState, sidebarStateModifier] = useSidebarState('Project')

  function showProject(project?: Project) {
    setId(project?.id ?? randomUUID())
    setName(project?.name ?? '')
    setOwnerId(project?.owner_id ?? '')
    setArchived(project?.archived ?? false)
    sidebarStateModifier.openSidebar(project ? project.name : 'New Project')
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
        state={sidebarState}
        onClose={() => { sidebarStateModifier.closeSidebar() }}
        onSave={() => { sidebarStateModifier.execute(saveProject({ id, name, owner_id, archived }), addProject) }}
        onDelete={() => { sidebarStateModifier.execute(deleteProject(id), () => { removeProject(id) }) }}
      >
        <Input type="text" label="Name" required value={name} onChange={(e) => { setName(e.target.value) }} />
        <Input type="text" label="Owner ID" required value={owner_id} onChange={(e) => { setOwnerId(e.target.value) }} />
        <Checkbox label="Archived" checked={archived} onChange={(e) => { setArchived(e.target.checked) }} />
      </Sidebar>
    </>
  )
}
