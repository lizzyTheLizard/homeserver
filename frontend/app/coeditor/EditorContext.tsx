import { GsCollapse, GsInput, GsSelect, GsTextarea } from 'homeserver-webcomponents/react'
import { type FormEvent } from 'react'
import style from './EditorContext.module.css'
import type { Template } from 'homeserver-backend/src/coeditor/template/Template'

interface Props {
  templates: Template[]
  template: Template
  parameters: Record<string, string>
  onTemplateChange: (template: Template) => void
  onParametersChange: (name: string, value: string | undefined) => void
}

export default function EditorContext({ templates, template, parameters, onParametersChange, onTemplateChange }: Props) {
  return (
    <GsCollapse header="Context" className={style.collapse}>
      <div className={`row ${style.row}`}>
        <GsSelect value={template.language} onChange={(e) => { onTemplateChange(getFirstTemplate(e, templates)) }} required>
          {[...new Set(templates.map(t => t.language))].map(lang => <option key={lang} value={lang}>{lang}</option>)}
        </GsSelect>
        <GsSelect value={template.id} onChange={(e) => { onTemplateChange(getTemplate(e, templates)) }} required>
          {templates.filter(t => t.language === template.language).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </GsSelect>
      </div>
      <div className={`row ${style.row}`}>
        {template.parameters.map((p) => {
          switch (p.type) {
            case 'STRING':
              return (
                <GsInput key={p.name} value={parameters[p.name]} onChange={(e) => { onParametersChange(p.name, e.currentTarget.value) }} label={p.name} required style={{ width: '100%' }} />
              )
            case 'SELECT':
              return (
                <GsSelect key={p.name} value={parameters[p.name]} onChange={(e) => { onParametersChange(p.name, e.currentTarget.value) }} label={p.name} style={{ width: '100%' }} required>
                  {p.values?.map(v => <option key={v} value={v}>{v}</option>)}
                </GsSelect>
              )
            case 'TEXT':
              return undefined
          }
        })}
      </div>
      {template.parameters.filter(p => p.type == 'TEXT').map(p => (
        <GsTextarea key={p.name} value={parameters[p.name]} onChange={(e) => { onParametersChange(p.name, e.currentTarget.value) }} label={p.name} className={style.textarea} required />
      ))}
    </GsCollapse>
  )
}

function getTemplate(e: FormEvent<{ value: string | undefined }>, templates: Template[]): Template {
  const result = templates.find(t => t.id === e.currentTarget.value)
  if (result === undefined) throw new Error('Template must be defined')
  return result
}
function getFirstTemplate(e: FormEvent<{ value: string | undefined }>, templates: Template[]): Template {
  const language = e.currentTarget.value
  if (language === undefined) throw new Error('Language must be defined')
  const result = templates.find(t => t.language === language)
  if (result === undefined) throw new Error('Template must be defined')
  return result
}
