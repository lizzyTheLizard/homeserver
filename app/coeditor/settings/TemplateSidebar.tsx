'use client'
import { useState } from 'react'
import { Template, TemplateInput } from '../Template'
import styles from './TemplateSidebar.module.css'
import { Input } from '@/app/shared/components/Input'
import { Textarea } from '@/app/shared/components/Textarea'
import { Button } from '@/app/shared/components/Button'
import { v4 as randomUUID } from 'uuid'
import { AwaitedActionResponse } from '@/app/shared/ActionResponse'

export interface TemplateSidebarProps {
  template?: Template
  onSave?: (template: TemplateInput, callback: (response: AwaitedActionResponse<Template>) => void) => void
  onDelete?: (id: string, callback: (response: AwaitedActionResponse<void>) => void) => void
  onClose?: () => void
}

export function TemplateSidebar({ template, onSave, onDelete, onClose }: TemplateSidebarProps) {
  const [id] = useState(template?.id ?? randomUUID())
  const [name, setName] = useState(template?.name ?? '')
  const [language, setLanguage] = useState(template?.language ?? '')
  const [text, setText] = useState(template?.text ?? '')
  const [error, setError] = useState<string | undefined>(undefined)

  function handleSave() {
    if (!onSave) return
    onSave({ id, name, language, text }, (result) => {
      if (!result.success) setError(result.error)
      else setError(undefined)
      if (!template) {
        setName('')
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
        <Input type="text" label="Name" value={name} onChange={(e) => { setName(e.target.value) }} />
        <Input type="text" label="Language" value={language} onChange={(e) => { setLanguage(e.target.value) }} />
        <Textarea className={styles.textarea} label="Text" value={text} onChange={(e) => { setText(e.target.value) }} />
        {error && <div className={styles.error}>{error}</div>}
        <Button type="button" variant="primary" onClick={handleSave}>Save</Button>
        {template !== undefined && <Button type="button" variant="danger" onClick={handleDelete}>Delete</Button>}
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </form>
    </>
  )
}
