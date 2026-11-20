'use client'

import { type Selection, Textarea } from '@/app/shared/_components/form/Textarea';
import { editorStateReducer, initialState } from '../_helper/Editor.state'
import { useCallback, useReducer, useState } from 'react'
import { AiChatInput } from '@/app/shared/_components/chat/AiChatInput'
import type { Discussion } from '../../_data/Discussion'
import { EditorContext } from './EditorContext'
import { Icon } from '@/app/shared/_components/Icon'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import type { PredefinedCommandType } from '../../_data/Command'
import type { Template } from '../../_data/Template'
import { executeCommand } from '../server'
import { v4 as randomUUID } from 'uuid'
import style from './Editor.module.css'
import { useRouter } from 'next/navigation'

const PROPOSED_ACTIONS: PredefinedCommandType[] = ['IMPROVE', 'REFORMULATE', 'SUMMARIZE', 'EXTEND']

export interface EditorProps {
  discussion?: Discussion
  templates: Template[]
}

export function Editor({ discussion, templates }: EditorProps) {
  const [state, dispatch] = useReducer(editorStateReducer, initialState(discussion, templates)),
   [customCommand, setCustomCommand] = useState(''),
   [selection, setSelection] = useState<Selection | undefined>(undefined),
   [executePending, setExecutePending] = useState(false),
   [error, setError] = useState<string | undefined>(undefined),
   router = useRouter()

  function execute(command?: PredefinedCommandType, restart?: boolean) {
    setExecutePending(true)
    const input = {
      custom_command: command ? undefined : customCommand,
      discussion_id: restart ? randomUUID() : discussion?.id ?? randomUUID(),
      id: randomUUID(),
      parameters: state.parameters,
      predefined_command: command,
      selection_end: selection?.end,
      selection_start: selection?.start,
      template_id: state.template.id,
      text: state.text,
    }
    executeCommand(input).then((result) => {
      if (!result.success) {
        setError(result.error)
        setExecutePending(false)
        return
      }
      dispatch({ discussion: result.data, restart: restart ?? false, type: 'COMMAND_EXECUTED' })
      setCustomCommand('')
      setError(undefined)
      setExecutePending(false)
      if (result.data.id !== discussion?.id)
        {router.replace(`/coeditor/editor?id=${result.data.id}`)}
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
    if (discussion) {return}
    if (state.text) {return}
    if (!state.contextValid) {return}
    if (Object.keys(state.parameters).length === 0) {return}
    execute('INITIALIZE', false)
  }

  return (
    <div className={style.editorPage}>
      {executePending && <LoadingSpinner text="Executing command..." />}
      <EditorContext
        templates={templates}
        template={state.template}
        parameters={state.parameters}
        onBlur={() => { initialize() }}
        onTemplateChange={useCallback((template: Template) => { dispatch({ template, type: 'TEMPLATE_CHANGE' }) }, [])}
        onParametersChange={useCallback((name: string, value: string | undefined) => { dispatch({ name, type: 'PARAMETERS_CHANGE', value }) }, [])}
      />
      <div className={style.toolbar}>
        <button className={style.iconButton} onClick={() => { dispatch({ type: 'UNDO' }) }} disabled={!state.undoStack.length} title="Undo"><Icon name="undo" style={{ height: 14, width: 14 }} /></button>
        <button className={style.iconButton} onClick={() => { dispatch({ type: 'REDO' }) }} disabled={!state.redoStack.length} title="Redo"><Icon name="redo" style={{ height: 14, width: 14 }} /></button>
        <button className={style.iconButton} onClick={() => { execute('INITIALIZE', true) }} disabled={!state.contextValid || !discussion?.id} title="New"><Icon name="new" style={{ height: 14, width: 14 }} /></button>
      </div>
      <Textarea
        className={style.textarea}
        label="Text"
        value={state.text}
        onChange={(e) => { dispatch({ text: e.currentTarget.value, type: 'TEXT_CHANGE' }) }}
        onBlur={() => { dispatch({ type: 'TEXT_BLUR' }) }}
        disabled={!state.contextValid}
        keepSelection
        onSelectionChange={setSelection}
       />
      <AiChatInput
        value={customCommand}
        onChange={setCustomCommand}
        onSubmit={() => { execute() }}
        disabled={!state.contextValid}
        actionsDisabled={state.text.length === 0}
        placeholder="Custom command…"
        actions={PROPOSED_ACTIONS.map(action => ({ label: predefinedCommandLabel(action) ?? '', onSelect: () => { execute(action) } }))}
      />
      {error && <div className={style.error}>{`Could not execute command: ${  error}`}</div>}
    </div>
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
