'use client'

import { useCallback, useReducer, useState } from 'react'
import { editorStateReducer, initialState } from './EditorState'
import { Discussion } from '../Discussion'
import { CommandInput, PredefinedCommandType } from '../Command'
import { Textarea, Selection } from '@/app/shared/components/Textarea'
import { Template } from '../Template'
import { v4 as randomUUID } from 'uuid'
import { useRouter } from 'next/navigation'
import { ActionResponse } from '@/app/shared/ActionResponse'
import style from './Editor.module.css'
import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { EditorContext } from './EditorContext'
import { Input } from '@/app/shared/components/Input'
import { Button } from '@/app/shared/components/Button'

export interface EditorProps {
  discussion: Discussion | undefined
  templates: Template[]
  executeCommand?: (input: CommandInput) => ActionResponse<Discussion>
}

export function Editor({ discussion, templates, executeCommand }: EditorProps) {
  const [state, dispatch] = useReducer(editorStateReducer, initialState(discussion, templates))
  const [customCommand, setCustomCommand] = useState('')
  const [selection, setSelection] = useState<Selection | undefined>(undefined)
  const [executePending, setExecutePending] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const router = useRouter()

  function execute(command?: PredefinedCommandType, restart?: boolean) {
    if (!executeCommand) return
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
      dispatch({ type: 'COMMAND_EXECUTED', discussion: result.data, restart: restart ?? false })
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
      <EditorContext
        templates={templates}
        template={state.template}
        parameters={state.parameters}
        onBlur={() => { initialize() }}
        onTemplateChange={useCallback((template: Template) => { dispatch({ type: 'TEMPLATE_CHANGE', template }) }, [])}
        onParametersChange={useCallback((name: string, value: string | undefined) => { dispatch({ type: 'PARAMETERS_CHANGE', name, value }) }, [])}
      />
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
      <div className={style.chatRow}>
        <Input
          value={customCommand}
          onChange={(e) => { setCustomCommand(e.currentTarget.value) }}
          onKeyDown={(e) => { handleCustomCommandKeyDown(e) }}
          label="Custom Command"
          disabled={!state.contextValid}
        >
        </Input>
        <Button onClick={() => { execute() }} disabled={!state.contextValid || !customCommand}>Send</Button>
      </div>
      {error && <div className={style.error}>{'Could not execute command: ' + error}</div>}
      <div className={style.buttons + ' buttons row'}>
        <Button onClick={() => { execute('IMPROVE') }} disabled={!state.contextValid}>Improve</Button>
        <Button onClick={() => { execute('REFORMULATE') }} disabled={!state.contextValid}>Reformulate</Button>
        <Button onClick={() => { execute('SUMMARIZE') }} disabled={!state.contextValid}>Summarize</Button>
        <Button onClick={() => { execute('EXTEND') }} disabled={!state.contextValid}>Extend</Button>
        <Button onClick={() => { dispatch({ type: 'UNDO' }) }} disabled={!state.undoStack.length}>Undo</Button>
        <Button onClick={() => { dispatch({ type: 'REDO' }) }} disabled={!state.redoStack.length}>Redo</Button>
        <Button onClick={() => { execute('INITIALIZE', true) }} disabled={!state.contextValid || !discussion?.id}>New</Button>
      </div>
    </>
  )
}
