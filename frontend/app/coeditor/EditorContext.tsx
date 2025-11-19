import { GsCollapse, GsInput, GsLoadingSpinner, GsSelect, GsTextarea } from 'homeserver-webcomponents/react'
import { useTemplateQuery, type Context } from './EditorServer'
import { use, useState } from 'react'
import style from './EditorContext.module.css'
import { AuthContext } from '../general/auth/AuthContext'

interface Props {
  onContextChange: (context: Context) => void
}

export default function EditorContext({ onContextChange }: Props) {
  const user = use(AuthContext)
  const { isLoading, isError, data, error } = useTemplateQuery(user)
  const [language, setLanguage] = useState('en')
  const [templateId, setTemplateId] = useState(undefined as string | undefined)
  const [parameterValues, setParameterValues] = useState({} as Record<string, string>)

  function showLoading() {
    return (
      <GsCollapse header="Context">
        <GsLoadingSpinner initial={true} />
      </GsCollapse>
    )
  }

  function showError(error: Error) {
    // TODO: Better error handling
    return (
      <GsCollapse header="Context">
        <span>
          {`Error: ${error.message}`}
        </span>
      </GsCollapse>
    )
  }

  function getValue(event: unknown): string {
    if (!event) throw new Error('Invalid event')
    if (typeof event !== 'object') throw new Error('Invalid event')
    if (!('target' in event)) throw new Error('Invalid event')
    const target = event.target

    if (!target) throw new Error('Invalid event target')
    if (typeof target !== 'object') throw new Error('Invalid event target')
    if (!('value' in target)) throw new Error('Invalid event target')
    const value = target.value

    if (typeof value !== 'string') throw new Error('Invalid event target value')
    return value
  }

  function setParameterValue(event: unknown, paramName: string): void {
    const newValue = getValue(event)
    const newParameters = { ...parameterValues, [paramName]: newValue }
    setParameterValues(newParameters)
    onContextChange({ language, templateId, parameters: newParameters })
  }

  function setLanguageAndResetContext(event: unknown): void {
    const newValue = getValue(event)
    setTemplateId(undefined)
    setLanguage(newValue)
    onContextChange({ language: newValue, templateId: undefined, parameters: {} })
  }

  function setTemplateIdAndResetContext(event: unknown): void {
    const newValue = getValue(event)
    const newParameters = {} as Record<string, string>
    setParameterValues(newParameters)
    setTemplateId(newValue)
    onContextChange({ language, templateId: newValue, parameters: newParameters })
  }

  if (isLoading) return showLoading()
  if (isError) return showError(error as Error)
  if (!data) return showError(new Error('No data received'))
  const languages = Array.from(new Set(data.map(t => t.language)))
  const template = data.find(t => t.id === templateId)
  console.log('Rendering context with template', template)
  return (
    <GsCollapse header="Context" className={style.collapse}>
      <div className={`row ${style.row}`}>
        <GsSelect value={language} onChange={(e) => { setLanguageAndResetContext(e) }} required>
          {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
        </GsSelect>
        <GsSelect value={template?.id} onChange={(e) => { setTemplateIdAndResetContext(e) }} emptyLabel="No Template">
          {data.filter(t => t.language === language).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </GsSelect>
      </div>
      <div className={`row ${style.row}`}>
        {template?.parameters.map((p) => {
          switch (p.type) {
            case 'STRING':
              return (
                <GsInput key={p.name} value={parameterValues[p.name]} onChange={(e) => { setParameterValue(e, p.name) }} label={p.name} required style={{ width: '100%' }} />
              )
            case 'SELECT':
              return (
                <GsSelect key={p.name} value={parameterValues[p.name]} onChange={(e) => { setParameterValue(e, p.name) }} label={p.name} style={{ width: '100%' }} required>
                  {p.values?.map(v => <option key={v} value={v}>{v}</option>)}
                </GsSelect>
              )
            case 'TEXT':
              return undefined
          }
        })}
      </div>
      {template?.parameters.filter(p => p.type == 'TEXT').map(p => (
        <GsTextarea key={p.name} value={parameterValues[p.name]} onChange={(e) => { setParameterValue(e, p.name) }} label={p.name} className={style.textarea} required />
      ))}
    </GsCollapse>
  )
}
