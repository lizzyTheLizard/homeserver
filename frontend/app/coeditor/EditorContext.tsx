import { GsCollapse, GsInput, GsSelect, GsTextarea } from 'homeserver-webcomponents/react'
import { type FormEvent } from 'react'
import style from './EditorContext.module.css'
import type { Template } from 'homeserver-backend/src/coeditor/template/Template'

interface Props {
  templates: Template[]
  template: Template | undefined
  parameters: Record<string, string>
  onTemplateChange: (template: Template) => void
  onParametersChange: (name: string, value: string | undefined) => void
}

export default function EditorContext({ templates, template, parameters, onParametersChange, onTemplateChange }: Props) {
  function getTemplate(e: InputEvent, templates: Template[]): Template {
    const id = e.currentTarget.value
    if (id === undefined) {
      throw new Error('Selected template id undefined.')
    }
    const result = templates.find(t => t.id === id)
    if (result === undefined) {
      throw new Error(`Template with id "${id}" not found.`)
    }
    return result
  }

  function getFirstTemplate(e: InputEvent, templates: Template[]): Template {
    const language = e.currentTarget.value
    if (language === undefined) {
      throw new Error('Selected language undefined.')
    }
    const result = templates.find(t => t.language === language)
    if (result === undefined) {
      throw new Error(`No template found for language "${language}".`)
    }
    return result
  }

  return (
    <GsCollapse header="Context" className={style.collapse}>
      <div className={`row ${style.row}`}>
        <GsSelect value={template?.language} onChange={(e: InputEvent) => { onTemplateChange(getFirstTemplate(e, templates)) }} required>
          {[...new Set(templates.map(t => t.language))].map(lang => <option key={lang} value={lang}>{lang}</option>)}
        </GsSelect>
        <GsSelect value={template?.id} onChange={(e: InputEvent) => { onTemplateChange(getTemplate(e, templates)) }} required>
          {templates.filter(t => t.language === template?.language).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </GsSelect>
      </div>
      <div className={`row ${style.row}`}>
        {template?.parameters.map((p) => {
          switch (p.type) {
            case 'STRING':
              return (
                <GsInput key={p.name} value={parameters[p.name]} onChange={(e: InputEvent) => { onParametersChange(p.name, e.currentTarget.value) }} label={p.name} required style={{ width: '100%' }} />
              )
            case 'SELECT':
              return (
                <GsSelect key={p.name} value={parameters[p.name]} onChange={(e: InputEvent) => { onParametersChange(p.name, e.currentTarget.value) }} label={p.name} style={{ width: '100%' }} required>
                  {p.values?.map(v => <option key={v} value={v}>{v}</option>)}
                </GsSelect>
              )
            case 'TEXT':
              return undefined
          }
        })}
      </div>
      {template?.parameters.filter(p => p.type == 'TEXT').map(p => (
        <GsTextarea key={p.name} value={parameters[p.name]} onChange={(e: InputEvent) => { onParametersChange(p.name, e.currentTarget.value) }} label={p.name} className={style.textarea} required />
      ))}
    </GsCollapse>
  )
}

type InputEvent = FormEvent<{ value: string | undefined }>
