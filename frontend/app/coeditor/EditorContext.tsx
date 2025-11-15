import { GsCollapse, GsInput, GsLoadingSpinner, GsSelect, GsTextarea } from 'homeserver-webcomponents/react'
import { useTemplateQuery, type Context } from './EditorServer'
import { useState, type FormEvent } from 'react'
import style from './EditorContext.module.css'

interface Props {
  onContextChange: (context: Context) => void
}

export default function EditorContext({ onContextChange }: Props) {
  const { isLoading, isError, data, error } = useTemplateQuery()
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
          Error: {error.message}
        </span>
      </GsCollapse>
    )
  }

  function setParameterValue(event: FormEvent, paramName: string): void {
    const newValue = (event.target as HTMLInputElement).value
    const newParameters = { ...parameterValues, [paramName]: newValue }
    setParameterValues(newParameters)
    onContextChange({ language, templateId, parameters: newParameters })
  }

  function setLanguageAndResetContext(event: FormEvent): void {
    const lang = (event.target as HTMLSelectElement).value
    setTemplateId(undefined)
    setLanguage(lang)
    onContextChange({ language: lang, templateId: undefined, parameters: {} })
  }

  function setTemplateIdAndResetContext(event: FormEvent): void {
    const id = (event.target as HTMLSelectElement).value
    const newParameters = {} as Record<string, string>
    setParameterValues(newParameters)
    setTemplateId(id)
    onContextChange({ language, templateId: id, parameters: newParameters })
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
