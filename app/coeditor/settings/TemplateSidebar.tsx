'use client'
import { useState } from 'react'
import { TemplateInput } from '../Template'
import styles from './TemplateSidebar.module.css'
import { Input } from '@/app/shared/components/Input'
import { Textarea } from '@/app/shared/components/Textarea'
import { Button } from '@/app/shared/components/Button'

export interface TemplateSidebarProps {
  template: TemplateInput
  error?: string | undefined
  onSave?: (template: TemplateInput) => void
  onDelete?: (template: TemplateInput) => void
  onClose?: () => void
}

export function TemplateSidebar({ template, error, onSave, onDelete, onClose }: TemplateSidebarProps) {
  const [id] = useState(template.id)
  const [name, setName] = useState(template.name)
  const [language, setLanguage] = useState(template.language)
  const [text, setText] = useState(template.text)

  return (
    <form className={styles.form}>
      <Input type="text" label="Name" value={name} onChange={(e) => { setName(e.target.value) }} />
      <Input type="text" label="Language" value={language} onChange={(e) => { setLanguage(e.target.value) }} />
      <Textarea className={styles.textarea} label="Text" value={text} onChange={(e) => { setText(e.target.value) }} />
      {error && <div className={styles.error}>{error}</div>}
      <Button type="button" variant="primary" onClick={() => onSave?.({ id, name, language, text })}>Save</Button>
      <Button type="button" variant="danger" onClick={() => onDelete?.({ id, name, language, text })}>Delete</Button>
      <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
    </form>
  )
}
