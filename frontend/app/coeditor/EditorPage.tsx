import { GsButton, showMessage, GsInput } from 'homeserver-webcomponents/react'
import EditorContext from './EditorContext'
import { useCallback, useContext, useEffect, useReducer, useState, type FormEvent } from 'react'
import { editorStateReducer, initialState } from './EditorState'
import { useDiscussionQuery, useExecuteCommandMutation, useStartDiscussionMutation, useTemplateQuery } from './EditorQueries'
import { AuthContext, ensureApplicationAccess } from '../general/auth/AuthContext'
import style from './EditorPage.module.css'
import type { Application } from '../Application'
import { useNavigate } from 'react-router'
import type { Discussion } from 'homeserver-backend/src/coeditor/discussion/Discussion'
import type { PredefinedCommandType } from 'homeserver-backend/src/coeditor/command/Command'
import GsTextarea2, { type Selection } from './GsTextarea2'

export default function EditorPage() {
  const user = useContext(AuthContext)
  ensureApplicationAccess(user, 'coeditor')
  const navigate = useNavigate()

  // Mutations
  const startDiscussion = useStartDiscussionMutation(user)
  const executeCommand = useExecuteCommandMutation(user)

  // Get templates
  const templatesQuery = useTemplateQuery(user)
  // TODO: Better error handling
  if (templatesQuery.isError) throw new Error('Failed to load templates', templatesQuery.error)

  // Get existing discussion if any
  const existingDiscussionId = new URLSearchParams(window.location.search).get('id')
  const existingDiscussionQuery = useDiscussionQuery(user, existingDiscussionId)
  // TODO: Better error handling
  if (existingDiscussionQuery.isError) throw new Error('Failed to load discussion', existingDiscussionQuery.error)

  // State management
  const [state, dispatch] = useReducer(editorStateReducer, initialState(templatesQuery.data, existingDiscussionQuery.data))
  const [customCommand, setCustomCommand] = useState('')
  const [selection, setSelection] = useState<Selection | undefined>(undefined)

  function onCommandSuccess(result: Discussion) {
    dispatch({ type: 'COMMAND_EXECUTED', discussion: result })
    if (result.id !== state.discussion_id) {
      console.log('Navigating to newly created discussion', result.id)
      void navigate(`/coeditor?id=${result.id}`)
    }
    setCustomCommand('')
  }

  function execute(command?: PredefinedCommandType) {
    executeCommand.mutate(
      command
        ? { ...state, selection_start: selection?.start, selection_end: selection?.end, predefinedCommand: command }
        : { ...state, selection_start: selection?.start, selection_end: selection?.end, customCommand: customCommand },
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
        templates={templatesQuery.data}
        template={state.template}
        parameters={state.parameters}
        onTemplateChange={useCallback((template) => { dispatch({ type: 'TEMPLATE_CHANGE', template }) }, [])}
        onParametersChange={useCallback((name, value) => { dispatch({ type: 'PARAMETERS_CHANGE', name, value }) }, [])}
      />
      <GsTextarea2
        className={style.textarea}
        value={state.text}
        onChange={(text) => { dispatch({ type: 'TEXT_CHANGE', text }) }}
        disabled={!state.contextValid}
        onSelectionChange={setSelection}
      >
      </GsTextarea2>
      <div className={style.chat}>
        <GsInput value={customCommand} onChange={(e: InputEvent) => { setCustomCommand(getValue(e)) }} className={style['chat-input']} disabled={!state.contextValid}></GsInput>
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

function getValue(e: InputEvent): string {
  const result = e.currentTarget.value
  // TODO: Better error handling
  if (result === undefined) throw new Error('Value must be defined')
  return result
}

function onCommandError(error: unknown) {
  // TODO: Better error handling
  console.error('Command execution failed:', error)
  showMessage('danger', 'Error executing command', 5000)
}

type InputEvent = FormEvent<{ value: string | undefined }>
