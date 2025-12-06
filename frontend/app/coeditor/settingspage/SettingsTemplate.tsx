import { GsButton, GsInput, GsTextarea } from 'homeserver-webcomponents/react'
import { useState, type FormEvent } from 'react'
import type { TemplateInput } from 'homeserver-backend/src/coeditor/template/TemplateInput'
import { v4 as uuid } from 'uuid'
import style from '../SettingsPage.module.css'

interface SettingsTemplateProps {
  id?: string
  name?: string
  language?: string
  text?: string
  onDelete?: (id: string) => void
  onChange?: (t: TemplateInput) => void
}

export default function SettingsTemplate(props: SettingsTemplateProps) {
  const [language, setLanguage] = useState(props.language)
  const [text, setText] = useState(props.text)
  const [name, setName] = useState(props.name)

  function saveTemplate() {
    if (!name || !language) return
    props.onChange?.({ id: props.id ?? uuid(), name, language, text: text ?? '' })
    if (props.id === undefined) {
      setLanguage('')
      setText('')
      setName('')
    }
  }

  function deleteTemplate() {
    if (!props.id) return
    props.onDelete?.(props.id)
  }

  return (
    <tr>
      <td>
        <GsInput
          label="Language"
          className={style.input}
          changeOnKeyup={true}
          value={language}
          onChange={(e: InputEvent) => { setLanguage(e.currentTarget.value) }}
          disabled={!!props.language}
        >
        </GsInput>
        <GsInput
          label="Name"
          className={style.input}
          changeOnKeyup={true}
          value={name}
          onChange={(e: InputEvent) => { setName(e.currentTarget.value) }}
          disabled={!!props.name}
        >
        </GsInput>
      </td>
      <td>
        <GsTextarea
          label="Template"
          changeOnKeyup={true}
          value={text}
          onChange={(e: InputEvent) => { setText(e.currentTarget.value) }}
          className={style.textarea}
          disabled={!language}
        >
        </GsTextarea>
      </td>
      <td>
        <GsButton
          type="primary"
          className={style.actionButton}
          disabled={!name || !language}
          onClick={saveTemplate}
        >
          Save
        </GsButton>
        <GsButton
          type="danger"
          className={style.actionButton}
          disabled={!props.id}
          onClick={deleteTemplate}
        >
          Delete
        </GsButton>
      </td>
    </tr>
  )
}

type InputEvent = FormEvent<{ value: string | undefined }>
