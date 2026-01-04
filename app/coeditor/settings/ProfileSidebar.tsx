'use client'
import { useState } from 'react'
import { Input } from '@/app/shared/components/form/Input'
import { Textarea } from '@/app/shared/components/form/Textarea'
import { Button } from '@/app/shared/components/form/Button'
import { ProfileInput } from '../Profile'
import styles from './ProfileSidebar.module.css'

export interface ProfileSidebarProps {
  profile: ProfileInput
  error?: string | undefined
  onSave?: (profile: ProfileInput) => void
  onDelete?: (profile: ProfileInput) => void
  onClose?: () => void
}

export function ProfileSidebar({ profile, error, onSave, onDelete, onClose }: ProfileSidebarProps) {
  const [id] = useState(profile.id)
  const [language, setLanguage] = useState(profile.language)
  const [text, setText] = useState(profile.text)

  return (
    <form className={styles.form}>
      <Input type="text" label="Language" value={language} onChange={(e) => { setLanguage(e.target.value) }} />
      <Textarea className={styles.textarea} label="Text" value={text} onChange={(e) => { setText(e.target.value) }} />
      {error && <div className={styles.error}>{error}</div>}
      <Button type="button" variant="primary" onClick={() => onSave?.({ id, language, text })}>Save</Button>
      <Button type="button" variant="danger" onClick={() => onDelete?.({ id, language, text })}>Delete</Button>
      <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
    </form>
  )
}
