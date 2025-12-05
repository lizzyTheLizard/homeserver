import { GsButton, GsInput, GsTextarea } from 'homeserver-webcomponents/react'
import { useContext, useState, type FormEvent } from 'react'
import { useDeleteProfileMutation, useSaveProfileMutation } from './EditorQueries'
import { AuthContext } from '../general/auth/AuthContext'
import style from './SettingsPage.module.css'

interface SettingsProfileProps {
  language?: string
  text?: string
}

export default function SettingsProfile(props: SettingsProfileProps) {
  const user = useContext(AuthContext)
  const [language, setLanguage] = useState(props.language)
  const [text, setText] = useState(props.text)
  const deleteProfileMutation = useDeleteProfileMutation(user)
  const saveProfileMutation = useSaveProfileMutation(user)

  function saveProfile() {
    if (!language || !text) return
    saveProfileMutation.mutate({ language, text })
    if (!props.language) {
      setLanguage('')
      setText('')
    }
  }

  function deleteProfile() {
    if (!language) return
    deleteProfileMutation.mutate(language)
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
      </td>
      <td>
        <GsTextarea
          label="Profile"
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
        <GsButton type="primary" className={style.actionButton} disabled={!language || !text} onClick={saveProfile}>Save</GsButton>
        <GsButton type="danger" className={style.actionButton} disabled={!props.language} onClick={deleteProfile}>Delete</GsButton>
      </td>
    </tr>
  )
}

type InputEvent = FormEvent<{ value: string | undefined }>
