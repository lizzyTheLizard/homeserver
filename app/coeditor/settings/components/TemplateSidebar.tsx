import { startTransition, useActionState, useContext, useState } from 'react'
import { Template } from '../../Template'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import styles from './SettingsRow.module.css'
import Input from '@/app/shared/components/Input'
import Textarea from '@/app/shared/components/Textarea'
import Button from '@/app/shared/components/Button'
import { updateTemplate } from './updateTemplate'
import { SidebarContext } from '@/app/shared/components/Sidebar.context'
import { useRouter } from 'next/navigation'
import { v4 as randomUUID } from 'uuid'
import { deleteTemplate } from './deleteTemplate'

export interface TemplateSidebarProps {
  template?: Template
}

export function TemplateSidebar({ template }: TemplateSidebarProps) {
  const sidebar = useContext(SidebarContext)
  const router = useRouter()
  const [name, setName] = useState(template?.name ?? '')
  const [language, setLanguage] = useState(template?.language ?? '')
  const [text, setText] = useState(template?.text ?? '')
  const [saveState, saveAction, savePending] = useActionState(save, { })
  const [deleteState, deleteAction, deletePending] = useActionState(remove, { })

  async function save() {
    const result = await updateTemplate({ id: template?.id ?? randomUUID(), name, language, text })
    if (!result.error) {
      sidebar?.close()
      router.refresh()
    }
    return result
  }
  async function remove() {
    const result = await deleteTemplate(template?.id)
    if (!result.error) {
      sidebar?.close()
      router.refresh()
    }
    return result
  }

  return (
    <>
      {savePending && <LoadingSpinner text="Saving..." />}
      {deletePending && <LoadingSpinner text="Deleting..." />}
      <form className={styles.form}>
        <Input type="text" label="Name" value={name} onChange={(e) => { setName(e.target.value) }} />
        <Input type="text" label="Language" value={language} onChange={(e) => { setLanguage(e.target.value) }} />
        <Textarea className={styles.textarea} label="Text" value={text} onChange={(e) => { setText(e.target.value) }} />
        {saveState.error && <div className={styles.error}>{'Could not store template: ' + saveState.error}</div>}
        {deleteState.error && <div className={styles.error}>{'Could not delete template: ' + deleteState.error}</div>}
        <Button type="button" variant="primary" onClick={() => { startTransition(saveAction) }}>Save</Button>
        {template !== undefined && <Button variant="danger" onClick={() => { startTransition(deleteAction) }}>Delete</Button>}
        <Button type="button" variant="secondary" onClick={() => { sidebar?.close() }}>Cancel</Button>
      </form>
    </>
  )
}
