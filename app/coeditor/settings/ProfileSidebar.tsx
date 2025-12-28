'use client'
import { useState } from 'react'
import styles from './ProfileSidebar.module.css'
import { Input } from '@/app/shared/components/Input'
import { Textarea } from '@/app/shared/components/Textarea'
import Button from '@/app/shared/components/Button'
import { Profile, ProfileInput } from '../Profile'
import { AwaitedActionResponse } from '@/app/shared/ActionResponse'
import { v4 as randomUUID } from 'uuid'

export interface ProfileSidebarProps {
  profile?: Profile
  onClose?: () => void
  onSave?: (profile: ProfileInput, callback: (response: AwaitedActionResponse<Profile>) => void) => void
  onDelete?: (language: string, callback: (response: AwaitedActionResponse<void>) => void) => void
}

export function ProfileSidebar({ profile, onSave, onDelete, onClose }: ProfileSidebarProps) {
  const [id] = useState(profile?.id ?? randomUUID())
  const [language, setLanguage] = useState(profile?.language ?? '')
  const [text, setText] = useState(profile?.text ?? '')
  const [error, setError] = useState<string | undefined>(undefined)

  function handleSave() {
    if (!onSave) return
    onSave({ id, language, text }, (result) => {
      if (!result.success) setError(result.error)
      else setError(undefined)
      if (!profile) {
        setLanguage('')
        setText('')
      }
    })
  }

  function handleDelete() {
    if (!onDelete) return
    onDelete(id, (result) => {
      if (!result.success) setError(result.error)
      else setError(undefined)
    })
  }

  return (
    <>
      <form className={styles.form}>
        <Input type="text" label="Language" value={language} onChange={(e) => { setLanguage(e.target.value) }} />
        <Textarea className={styles.textarea} label="Text" value={text} onChange={(e) => { setText(e.target.value) }} />
        {error && <div className={styles.error}>{error}</div>}
        <Button type="button" variant="primary" onClick={handleSave}>Save</Button>
        {profile !== undefined && <Button type="button" variant="danger" onClick={handleDelete}>Delete</Button>}
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </form>
    </>
  )
}
