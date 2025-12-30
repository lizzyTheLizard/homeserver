'use client'
import { useState } from 'react'
import styles from './ProjectSidebar.module.css'
import { Input } from '@/app/shared/components/Input'
import { Button } from '@/app/shared/components/Button'
import { ProjectInput } from '@/app/cash/Project'
import { Checkbox } from '@/app/shared/components/Checkbox'

export interface ProjectSidebarProps {
  project: ProjectInput
  error?: string | undefined
  onSave?: (project: ProjectInput) => void
  onDelete?: (project: ProjectInput) => void
  onClose?: () => void
}

export function ProjectSidebar({ project, error, onSave, onDelete, onClose }: ProjectSidebarProps) {
  const [id] = useState(project.id)
  const [name, setName] = useState(project.name)
  const [archived, setArchived] = useState(project.archived)
  const [owner_id, setOwnerId] = useState(project.owner_id)

  return (
    <form className={styles.form}>
      <Input type="text" label="Name" required value={name} onChange={(e) => { setName(e.target.value) }} />
      <Input type="text" label="Owner ID" required value={owner_id} onChange={(e) => { setOwnerId(e.target.value) }} />
      <Checkbox label="Archived" checked={archived} onChange={(e) => { setArchived(e.target.checked) }} />
      {error && <div className={styles.error}>{error}</div>}
      <Button type="button" variant="primary" onClick={() => onSave?.({ id, name, archived, owner_id })}>Save</Button>
      <Button type="button" variant="danger" onClick={() => onDelete?.({ id, name, archived, owner_id })}>Delete</Button>
      <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
    </form>
  )
}
