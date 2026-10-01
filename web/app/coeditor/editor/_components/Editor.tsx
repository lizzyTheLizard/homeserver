'use client'

import { useCallback, useReducer, useState } from 'react'
import { editorStateReducer, initialState, predefinedCommandLabel } from '../_helper/Editor.state'
import { Command, PredefinedCommandType } from '../../_data/Command'
import { Discussion } from '../../_data/Discussion'
import { Textarea, Selection } from '@/app/shared/_components/form/Textarea'
import { Template } from '../../_data/Template'
import { v4 as randomUUID } from 'uuid'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { EditorContext } from './EditorContext'
import { EditorChat } from './EditorChat'
import { executeCommand } from '../server'
import style from './Editor.module.css'

export interface EditorProps {
  discussion?: Discussion
  templates: Template[]
  commands: Command[]
}

export function Editor({ discussion, templates, commands }: EditorProps) {
  const [state, dispatch] = useReducer(editorStateReducer, initialState(discussion, templates, commands))
  const [customCommand, setCustomCommand] = useState('')
  const [selection, setSelection] = useState<Selection | undefined>(undefined)
  const [executePending, setExecutePending] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const router = useRouter()

  function execute(command?: PredefinedCommandType, restart?: boolean) {
    setExecutePending(true)
    const input = {
      id: randomUUID(),
      discussion_id: restart ? randomUUID() : discussion?.id ?? randomUUID(),
      template_id: state.template.id,
      text: state.text,
      parameters: state.parameters,
      selection_start: selection?.start,
      selection_end: selection?.end,
      custom_command: command ? undefined : customCommand,
      predefined_command: command,
    }
    executeCommand(input).then((result) => {
      if (!result.success) {
        setError(result.error)
        setExecutePending(false)
        return
      }
      dispatch({ type: 'COMMAND_EXECUTED', discussion: result.data, restart: restart ?? false, userMessage: command ? predefinedCommandLabel(command) ?? command : customCommand, assistantMessage: result.data.text })
      setCustomCommand('')
      setError(undefined)
      setExecutePending(false)
      if (result.data.id !== discussion?.id)
        router.replace(`/coeditor/editor?id=${result.data.id}`)
    }).catch((error: unknown) => {
      console.error('Error executing command:', error)
      setExecutePending(false)
      setError(error instanceof Error ? error.message : String(error))
    })
  }

  function handleCustomCommandKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!state.contextValid || !customCommand) return
      execute()
    }
  }

  function initialize() {
    // Initializ  e discussion automatically text when:
    // * A template with parameters is filled out
    // * AND no discussion is running
    // * AND no text has been entered yet
    // This will prefill the editor with an initial text based on the template and parameters.
    if (discussion) return
    if (state.text) return
    if (!state.contextValid) return
    if (Object.keys(state.parameters).length === 0) return
    execute('INITIALIZE', false)
  }

  return (
    <>
      {executePending && <LoadingSpinner text="Executing command..." />}
      <div className={style.columns}>
        <div className={style.mainColumn}>
          <EditorContext
            templates={templates}
            template={state.template}
            parameters={state.parameters}
            onBlur={() => { initialize() }}
            onTemplateChange={useCallback((template: Template) => { dispatch({ type: 'TEMPLATE_CHANGE', template }) }, [])}
            onParametersChange={useCallback((name: string, value: string | undefined) => { dispatch({ type: 'PARAMETERS_CHANGE', name, value }) }, [])}
          />
          <div className={style.toolbar}>
            <button className={style.iconButton} onClick={() => { dispatch({ type: 'UNDO' }) }} disabled={!state.undoStack.length} title="Undo"><UndoIcon /></button>
            <button className={style.iconButton} onClick={() => { dispatch({ type: 'REDO' }) }} disabled={!state.redoStack.length} title="Redo"><RedoIcon /></button>
            <button className={style.iconButton} onClick={() => { execute('INITIALIZE', true) }} disabled={!state.contextValid || !discussion?.id} title="New"><NewIcon /></button>
          </div>
          <Textarea
            className={style.textarea}
            label="Text"
            value={state.text}
            onChange={(e) => { dispatch({ type: 'TEXT_CHANGE', text: e.currentTarget.value }) }}
            onBlur={() => { dispatch({ type: 'TEXT_BLUR' }) }}
            disabled={!state.contextValid}
            keepSelection={true}
            onSelectionChange={setSelection}
          >
          </Textarea>
        </div>
        <div className={style.chatColumn}>
          <EditorChat
            messages={state.messages}
            contextValid={state.contextValid}
            customCommand={customCommand}
            error={error}
            onCustomCommandChange={setCustomCommand}
            onCustomCommandKeyDown={(e) => { handleCustomCommandKeyDown(e) }}
            onSend={() => { execute() }}
            onAction={(command) => { execute(command) }}
          />
        </div>
      </div>
    </>
  )
}

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path fillRule="evenodd" d="M6.5 3.5a5 5 0 1 1-4.545 2.914.5.5 0 0 0 .909-.417A4 4 0 1 0 6.5 4.5v1z" />
      <path d="M6.5 4.466V.534a.25.25 0 0 0-.41-.192L3.73 2.308a.25.25 0 0 0 0 .384l2.36 1.966a.25.25 0 0 0 .41-.192z" />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ transform: 'scaleX(-1)' }}>
      <path fillRule="evenodd" d="M6.5 3.5a5 5 0 1 1-4.545 2.914.5.5 0 0 0 .909-.417A4 4 0 1 0 6.5 4.5v1z" />
      <path d="M6.5 4.466V.534a.25.25 0 0 0-.41-.192L3.73 2.308a.25.25 0 0 0 0 .384l2.36 1.966a.25.25 0 0 0 .41-.192z" />
    </svg>
  )
}

function NewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 3a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 8 3z" />
    </svg>
  )
}
