'use client'
import { startTransition, useState } from 'react'
import { Template, TemplateInput } from '../Template'
import styles from './TemplateSidebar.module.css'
import Input from '@/app/shared/components/Input'
import Textarea from '@/app/shared/components/Textarea'
import Button from '@/app/shared/components/Button'

export interface TemplateSidebarProps {
  template?: Template
  onSave?: (template: TemplateInput) => Promise<{ error?: string }>
  onDelete?: (template: TemplateInput) => Promise<{ error?: string }>
  onClose?: () => void
}

export function TemplateSidebar({ template, onSave, onDelete, onClose }: TemplateSidebarProps) {
  const [id] = useState(template?.id ?? '')
  const [name, setName] = useState(template?.name ?? '')
  const [language, setLanguage] = useState(template?.language ?? '')
  const [text, setText] = useState(template?.text ?? '')
  const [error, setError] = useState<string | undefined>(undefined)

  function handle(fn?: (template: TemplateInput) => Promise<{ error?: string }>) {
    setError(undefined)
    startTransition(async () => {
      const result = await fn?.({ id, name, language, text })
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <form className={styles.form}>
        <Input type="text" label="Name" value={name} onChange={(e) => { setName(e.target.value) }} />
        <Input type="text" label="Language" value={language} onChange={(e) => { setLanguage(e.target.value) }} />
        <Textarea className={styles.textarea} label="Text" value={text} onChange={(e) => { setText(e.target.value) }} />
        {error && <div className={styles.error}>{error}</div>}
        <Button type="button" variant="primary" onClick={() => { handle(onSave) }}>Save</Button>
        {template !== undefined && <Button type="button" variant="danger" onClick={() => { handle(onDelete) }}>Delete</Button>}
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </form>
    </>
  )
}
