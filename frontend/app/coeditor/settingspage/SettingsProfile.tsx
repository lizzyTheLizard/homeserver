import { GsButton, GsInput, GsTextarea } from 'homeserver-webcomponents/react'
import { useState, type FormEvent } from 'react'
import type { ProfileInput } from 'homeserver-backend/src/coeditor/profile/ProfileInput'
import style from '../SettingsPage.module.css'

interface SettingsProfileProps {
  language?: string
  text?: string
  onDelete?: (language: string) => void
  onChange?: (p: ProfileInput) => void
}

export default function SettingsProfile(props: SettingsProfileProps) {
  const [language, setLanguage] = useState(props.language)
  const [text, setText] = useState(props.text)

  function saveProfile() {
    if (!language || !text) return
    props.onChange?.({ language, text })
    if (props.language === undefined) {
      setLanguage('')
      setText('')
    }
  }

  function deleteProfile() {
    if (!language) return
    props.onDelete?.(language)
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
        <GsButton
          type="primary"
          className={style.actionButton}
          disabled={!language || !text}
          onClick={saveProfile}
        >
          Save
        </GsButton>
        <GsButton
          type="danger"
          className={style.actionButton}
          disabled={!props.language}
          onClick={deleteProfile}
        >
          Delete
        </GsButton>
      </td>
    </tr>
  )
}

type InputEvent = FormEvent<{ value: string | undefined }>
