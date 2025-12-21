'use client'
import { startTransition, useState } from 'react'
import styles from './ProfileSidebar.module.css'
import Input from '@/app/shared/components/Input'
import Textarea from '@/app/shared/components/Textarea'
import Button from '@/app/shared/components/Button'
import { Profile, ProfileInput } from '../Profile'
export interface ProfileSidebarProps {
  profile?: Profile
  onClose?: () => void
  onSave?: (profile: ProfileInput) => Promise<{ error?: string }>
  onDelete?: (language: string) => Promise<{ error?: string }>
}

export function ProfileSidebar({ profile, onSave, onDelete, onClose }: ProfileSidebarProps) {
  const [language, setLanguage] = useState(profile?.language ?? '')
  const [text, setText] = useState(profile?.text ?? '')
  const [error, setError] = useState<string | undefined>(undefined)

  function handleSave() {
    setError(undefined)
    startTransition(async () => {
      const result = await onSave?.({ language, text })
      if (result?.error) {
        setError(result.error)
      }
      if (!profile) {
        setLanguage('')
        setText('')
      }
    })
  }

  function handleDelete() {
    setError(undefined)
    startTransition(async () => {
      const result = await onDelete?.(language)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <form className={styles.form}>
        <Input type="text" label="Language" disabled={!!profile} value={language} onChange={(e) => { setLanguage(e.target.value) }} />
        <Textarea className={styles.textarea} label="Text" value={text} onChange={(e) => { setText(e.target.value) }} />
        {error && <div className={styles.error}>{error}</div>}
        <Button type="button" variant="primary" onClick={handleSave}>Save</Button>
        {profile !== undefined && <Button type="button" variant="danger" onClick={handleDelete}>Delete</Button>}
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </form>
    </>
  )
}
