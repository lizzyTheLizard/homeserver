import { GsButton, showMessage, GsInput, GsTextarea } from 'homeserver-webcomponents/react'
import EditorContext from './EditorContext'
import { useCallback, useContext, useEffect, useReducer, useState, type FormEvent } from 'react'
import { editorStateReducer, initialState } from './EditorState'
import { useExecuteCommandMutation, useStartDiscussionMutation, useTemplateQuery } from './EditorQueries'
import { AuthContext, ensureApplicationAccess } from '../general/auth/AuthContext'
import style from './EditorPage.module.css'
import type { Application } from '../Application'
import { useNavigate } from 'react-router'
import type { Discussion } from 'homeserver-backend/src/coeditor/discussion/Discussion'
import type { PredefinedCommandType } from 'homeserver-backend/src/coeditor/command/Command'

// TODO: Load existing discussion if discussion_id is provided in URL
export default function EditorPage() {
  const user = useContext(AuthContext)
  ensureApplicationAccess(user, 'coeditor')
  const { isError, data: templates, error } = useTemplateQuery(user)
  if (isError) throw new Error('Failed to load templates', error)
  const [state, dispatch] = useReducer(editorStateReducer, initialState(templates))
  const startDiscussion = useStartDiscussionMutation(user)
  const executeCommand = useExecuteCommandMutation(user)
  const [customCommand, setCustomCommand] = useState('')
  const navigate = useNavigate()

  function onCommandSuccess(result: Discussion) {
    dispatch({ type: 'COMMAND_EXECUTED', discussion: result })
    // Navigate to the new discussion if needed
    if (result.id !== state.discussion_id) void navigate(`/coeditor?id=${result.id}`)
  }

  function execute(command?: PredefinedCommandType) {
    executeCommand.mutate(
      command
        ? { ...state, predefinedCommand: command }
        : { ...state, customCommand: customCommand },
      { onSuccess: onCommandSuccess, onError: onCommandError },
    )
  }

  function restart() {
    startDiscussion.mutate(
      { ...state, discussion_id: undefined, text: '' },
      { onSuccess: onCommandSuccess, onError: onCommandError },
    )
  }

  useEffect(() => {
    // Initialize discussion automatically text when:
    // * A template with parameters is filled out
    // * AND no discussion is running
    // * AND no text has been entered yet
    // This will prefill the editor with an initial text based on the template and parameters.
    if (state.discussion_id) return
    if (state.text) return
    if (!state.contextValid) return
    if (Object.keys(state.parameters).length === 0) return
    executeCommand.mutate(
      { ...state, predefinedCommand: 'INITIALIZE' },
      { onSuccess: onCommandSuccess, onError: onCommandError },
    )
  })

  return (
    <main className={style.main}>
      <h1>CoEditor</h1>
      <EditorContext
        templates={templates}
        template={state.template}
        parameters={state.parameters}
        onTemplateChange={useCallback((template) => { dispatch({ type: 'TEMPLATE_CHANGE', template }) }, [])}
        onParametersChange={useCallback((name, value) => { dispatch({ type: 'PARAMETERS_CHANGE', name, value }) }, [])}
      />
      <GsTextarea
        value={state.text}
        onChange={(e) => { dispatch({ type: 'TEXT_CHANGE', text: getValue(e) }) }}
        className={style.textarea}
        disabled={!state.contextValid}
      >
      </GsTextarea>
      <div className={style.chat}>
        <GsInput value={customCommand} onChange={(e) => { setCustomCommand(getValue(e)) }} className={style['chat-input']} disabled={!state.contextValid}></GsInput>
        <GsButton onClick={() => { execute() }} disabled={!state.contextValid}>Send</GsButton>
      </div>
      <div className="row buttons">
        <GsButton onClick={() => { execute('IMPROVE') }} disabled={!state.contextValid}>Improve</GsButton>
        <GsButton onClick={() => { execute('REFORMULATE') }} disabled={!state.contextValid}>Reformulate</GsButton>
        <GsButton onClick={() => { execute('SUMMARIZE') }} disabled={!state.contextValid}>Summarize</GsButton>
        <GsButton onClick={() => { execute('EXTEND') }} disabled={!state.contextValid}>Extend</GsButton>
        <GsButton onClick={() => { dispatch({ type: 'UNDO' }) }} disabled={!state.undoStack.length}>Undo</GsButton>
        <GsButton onClick={() => { dispatch({ type: 'REDO' }) }} disabled={!state.redoStack.length}>Redo</GsButton>
        <GsButton onClick={() => { restart() }} disabled={!state.contextValid}>New</GsButton>
      </div>
    </main>
  )
}

export const handle: { application: Application } = {
  application: {
    name: 'CoEditor',
    links: [
      { href: '/coeditor/', text: 'Editor' },
      { href: '/coeditor/settings', text: 'Settings' },
      { href: '/coeditor/history', text: 'History' },
    ],
  },
}

function getValue(e: FormEvent<{ value: string | undefined }>): string {
  const result = e.currentTarget.value
  if (result === undefined) throw new Error('Value must be defined')
  return result
}

function onCommandError(error: unknown) {
  console.error('Command execution failed:', error)
  showMessage('danger', 'Error executing command', 5000)
}
