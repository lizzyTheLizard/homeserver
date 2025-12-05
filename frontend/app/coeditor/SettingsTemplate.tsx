import { GsButton, GsInput, GsTextarea } from 'homeserver-webcomponents/react'
import { useContext, useState, type FormEvent } from 'react'
import { useDeleteProfileMutation, useDeleteTemplateMutation, useSaveProfileMutation, useSaveTemplateMutation } from './EditorQueries'
import { AuthContext } from '../general/auth/AuthContext'
import { v4 as randomUUID } from 'uuid'
import style from './SettingsPage.module.css'

interface SettingsTemplateProps {
  id?: string
  name?: string
  language?: string
  text?: string
}

export default function SettingsTemplate(props: SettingsTemplateProps) {
  const user = useContext(AuthContext)
  const [language, setLanguage] = useState(props.language)
  const [text, setText] = useState(props.text)
  const [name, setName] = useState(props.name)
  const deleteTemplateMutation = useDeleteTemplateMutation(user)
  const saveTemplateMutation = useSaveTemplateMutation(user)

  function saveTemplate() {
    if (!name || !language || !text) return
    saveTemplateMutation.mutate({ id: props.id ?? randomUUID(), name, language, text })
    if (!props.language) {
      setLanguage('')
      setText('')
    }
  }

  function deleteTemplate() {
    if (!name) return
    deleteTemplateMutation.mutate(name)
  }

  return (
    <tr>
      <td>
        <GsInput
          label="Name"
          className={style.input}
          changeOnKeyup={true}
          value={name}
          onChange={(e: InputEvent) => { setName(e.currentTarget.value) }}
          disabled={!!props.name}
        >
        </GsInput>
        <GsInput
          label="Language"
          className={style.input}
          changeOnKeyup={true}
          value={language}
          onChange={(e: InputEvent) => { setLanguage(e.currentTarget.value) }}
          disabled={!!props.language}
        >
        </GsInput>
      </td>
      <td>
        <GsTextarea
          label="Template"
          changeOnKeyup={true}
          value={text}
          onChange={(e: InputEvent) => { setText(e.currentTarget.value) }}
          required
          className={style.textarea}
          disabled={!language}
        >
        </GsTextarea>
      </td>
      <td>
        <GsButton type="primary" className={style.actionButton} disabled={!name || !language || !text} onClick={saveTemplate}>Save</GsButton>
        <GsButton type="danger" className={style.actionButton} disabled={!props.name} onClick={deleteTemplate}>Delete</GsButton>
      </td>
    </tr>
  )
}

type InputEvent = FormEvent<{ value: string | undefined }>
