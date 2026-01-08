import { type FormEvent } from 'react'
import style from './EditorContext.module.css'
import { Template } from '../_data/Template'
import { Input } from '@/app/shared/_components/form/Input'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import { Collapse } from '@/app/shared/_components/Collapse'
import { Select } from '@/app/shared/_components/form/Select'

interface Props {
  templates: Template[]
  template: Template | undefined
  parameters: Record<string, string>
  onTemplateChange?: (template: Template) => void
  onParametersChange?: (name: string, value: string | undefined) => void
  onBlur?: () => void
}

export function EditorContext({ templates, template, parameters, onParametersChange, onTemplateChange, onBlur }: Props) {
  function handleTemplateChange(e: FormEvent<HTMLSelectElement>) {
    const id = e.currentTarget.value
    const result = templates.find(t => t.id === id)
    if (result === undefined) {
      throw new Error(`Template with id "${id}" not found.`)
    }
    onTemplateChange?.(result)
  }

  function handleLanguageChange(e: FormEvent<HTMLSelectElement>) {
    const language = e.currentTarget.value
    const result = templates.find(t => t.language === language)
    if (result === undefined) {
      throw new Error(`No template found for language "${language}".`)
    }
    onTemplateChange?.(result)
  }

  return (
    <Collapse header="Context" initiallyExpanded={true}>
      <div className={style.collapse}>
        <div className={`row ${style.row}`}>
          <Select value={template?.language} onChange={(e) => { handleLanguageChange(e) }} required label="Language">
            {[...new Set(templates.map(t => t.language))].map(lang => <option key={lang} value={lang}>{lang}</option>)}
          </Select>
          <Select value={template?.id} onChange={(e) => { handleTemplateChange(e) }} required label="Template">
            {templates.filter(t => t.language === template?.language).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
        <div className={`row ${style.row}`}>
          {template?.parameters.map((p) => {
            switch (p.type) {
              case 'STRING':
                return (
                  <Input
                    key={p.name}
                    value={parameters[p.name]}
                    label={p.name}
                    required
                    style={{ width: '100%' }}
                    onBlur={onBlur}
                    onChange={(e) => { onParametersChange?.(p.name, e.currentTarget.value) }}
                  />
                )
              case 'SELECT':
                return (
                  <Select
                    key={p.name}
                    value={parameters[p.name]}
                    label={p.name}
                    style={{ width: '100%' }}
                    required
                    onBlur={onBlur}
                    onChange={(e) => { onParametersChange?.(p.name, e.currentTarget.value) }}
                  >
                    {p.values?.map(v => <option key={v} value={v}>{v}</option>)}
                  </Select>
                )
              case 'TEXT':
                return undefined
            }
          })}
        </div>
        {template?.parameters.filter(p => p.type == 'TEXT').map(p => (
          <Textarea
            key={p.name}
            value={parameters[p.name]}
            label={p.name}
            className={style.textarea}
            required
            onBlur={onBlur}
            onChange={(e) => { onParametersChange?.(p.name, e.currentTarget.value) }}
          />
        ))}
      </div>
    </Collapse>
  )
}
