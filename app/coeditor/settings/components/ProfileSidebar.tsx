import { startTransition, useActionState, useContext, useState } from 'react'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import styles from './SettingsRow.module.css'
import Input from '@/app/shared/components/Input'
import Textarea from '@/app/shared/components/Textarea'
import Button from '@/app/shared/components/Button'
import { SidebarContext } from '@/app/shared/components/Sidebar.context'
import { useRouter } from 'next/navigation'
import { Profile } from '../../Profile'
import { updateProfile } from './updateProfile'
import { deleteProfile } from './deleteProfile'
export interface ProfileSidebarProps {
  profile?: Profile
}

export function ProfileSidebar({ profile }: ProfileSidebarProps) {
  const sidebar = useContext(SidebarContext)
  const router = useRouter()
  const [language, setLanguage] = useState(profile?.language ?? '')
  const [text, setText] = useState(profile?.text ?? '')
  const [saveState, saveAction, savePending] = useActionState(save, { })
  const [deleteState, deleteAction, deletePending] = useActionState(remove, { })

  async function save() {
    const result = await updateProfile({ language, text })
    if (!result.error) {
      sidebar?.close()
      router.refresh()
    }
    return result
  }

  async function remove() {
    const result = await deleteProfile(profile?.language)
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
        <Input type="text" label="Language" value={language} onChange={(e) => { setLanguage(e.target.value) }} />
        <Textarea className={styles.textarea} label="Text" value={text} onChange={(e) => { setText(e.target.value) }} />
        {saveState.error && <div className={styles.error}>{'Could not store profile: ' + saveState.error}</div>}
        {deleteState.error && <div className={styles.error}>{'Could not delete profile: ' + deleteState.error}</div>}
        <Button type="button" variant="primary" onClick={() => { startTransition(saveAction) }}>Save</Button>
        {profile !== undefined && <Button variant="danger" onClick={() => { startTransition(deleteAction) }}>Delete</Button>}
        <Button type="button" variant="secondary" onClick={() => { sidebar?.close() }}>Cancel</Button>
      </form>
    </>
  )
}
