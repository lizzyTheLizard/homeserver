'use client'

import { useCallback, useReducer, useState } from 'react'
import { editorStateReducer, initialState } from '../_helper/Editor.state'
import { PredefinedCommandType } from '../../_data/Command'
import { Discussion } from '../../_data/Discussion'
import { Textarea, Selection } from '@/app/shared/_components/form/Textarea'
import { Template } from '../../_data/Template'
import { v4 as randomUUID } from 'uuid'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Icon } from '@/app/shared/_components/Icon'
import { EditorContext } from './EditorContext'
import { AiChatInput } from '@/app/shared/_components/chat/AiChatInput'
import { executeCommand } from '../server'
import style from './Editor.module.css'

const PROPOSED_ACTIONS: PredefinedCommandType[] = ['IMPROVE', 'REFORMULATE', 'SUMMARIZE', 'EXTEND']

export interface EditorProps {
  discussion?: Discussion
  templates: Template[]
}

export function Editor({ discussion, templates }: EditorProps) {
  const [state, dispatch] = useReducer(editorStateReducer, initialState(discussion, templates))
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
      <div className={style.toolbar}>
        <button className={style.iconButton} onClick={() => { dispatch({ type: 'UNDO' }) }} disabled={!state.undoStack.length} title="Undo"><Icon name="undo" style={{ width: 14, height: 14 }} /></button>
        <button className={style.iconButton} onClick={() => { dispatch({ type: 'REDO' }) }} disabled={!state.redoStack.length} title="Redo"><Icon name="redo" style={{ width: 14, height: 14 }} /></button>
        <button className={style.iconButton} onClick={() => { execute('INITIALIZE', true) }} disabled={!state.contextValid || !discussion?.id} title="New"><Icon name="new" style={{ width: 14, height: 14 }} /></button>
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
      <AiChatInput
        value={customCommand}
        onChange={setCustomCommand}
        onSubmit={() => { execute() }}
        disabled={!state.contextValid || state.text.length === 0}
        placeholder="Custom command…"
        actions={PROPOSED_ACTIONS.map(action => ({ label: predefinedCommandLabel(action) ?? '', onSelect: () => { execute(action) } }))}
      />
      {error && <div className={style.error}>{'Could not execute command: ' + error}</div>}
    </>
  )
}

function predefinedCommandLabel(command: PredefinedCommandType | undefined): string | undefined {
  switch (command) {
    case 'INITIALIZE': return 'Initialize'
    case 'IMPROVE': return 'Improve'
    case 'REFORMULATE': return 'Reformulate'
    case 'SUMMARIZE': return 'Summarize'
    case 'EXTEND': return 'Extend'
    default: return undefined
  }
}
