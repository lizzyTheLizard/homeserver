import { GsButton, GsInput, GsTextarea } from 'homeserver-webcomponents/react'
import type { Application } from '../Application.ts'
import EditorContext from './EditorContext'
import { useContext, useReducer, useState, type FormEvent } from 'react'
import { editorStateReducer, initialEditorState } from './EditorState'
import { EditorServer } from './EditorServer'
import { AuthContext } from '../general/auth/AuthContext'

export default function EditorPage() {
  const user = useContext(AuthContext)
  user.ensureApplicationAccess('coeditor')
  const [editorState, dispatch] = useReducer(editorStateReducer, initialEditorState)
  const [customCommand, setCustomCommand] = useState('')

  function executeCommand(command: string): void {
    startDiscussionIfNeeded().then(async (id) => {
      const newText = await EditorServer.executeCommand({ ...editorState, discussionId: id }, command)
      dispatch({ type: 'TEXT_CHANGE', text: newText })
    }).catch((error: unknown) => {
      // TODO: Proper error handling
      console.error('Error executing custom command:', error)
    })
  }

  function executeCustomCommand(): void {
    startDiscussionIfNeeded().then(async (id) => {
      const newText = await EditorServer.executeCustomCommand({ ...editorState, discussionId: id }, customCommand)
      dispatch({ type: 'TEXT_CHANGE', text: newText })
    }).catch((error: unknown) => {
      // TODO: Proper error handling
      console.error('Error executing custom command:', error)
    })
  }

  async function startDiscussionIfNeeded(): Promise<string> {
    if (editorState.discussionId === undefined) {
      const result = await EditorServer.startDiscussionWithText()
      dispatch({ type: 'START', id: result.id })
      return result.id
    }
    return editorState.discussionId
  }

  function restart() {
    EditorServer.startDiscussion(editorState).then((result) => {
      dispatch({ type: 'START', ...result })
    }).catch((error: unknown) => {
      // TODO: Proper error handling
      console.error('Error executing custom command:', error)
    })
  }

  function onTextChangeHandler(event: FormEvent): void {
    const newText = (event.target as HTMLTextAreaElement).value
    dispatch({ type: 'TEXT_CHANGE', text: newText })
  }

  function onContextChangeHandler(newContext: string): void {
    dispatch({ type: 'CONTEXT_CHANGE', context: newContext })
    if (editorState.discussionId !== undefined) return
    EditorServer.startDiscussion({ ...editorState, currentContext: newContext }).then((result) => {
      dispatch({ type: 'START', ...result })
    }).catch((error: unknown) => {
      // TODO: Proper error handling
      console.error('Error executing custom command:', error)
    })
  }

  function onCustomCommandChangeHandler(event: FormEvent): void {
    const newCommand = (event.target as HTMLInputElement).value
    setCustomCommand(newCommand)
  }

  return (
    <main style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h1>CoEditor</h1>
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', gap: '5px' }}>
        <EditorContext onContextChange={onContextChangeHandler} />
        <GsTextarea value={editorState.currentText} style={{ flexGrow: 1 }} onChange={onTextChangeHandler}></GsTextarea>
        <div style={{ display: 'flex', width: '100%', gap: '5px' }}>
          <GsInput onChange={onCustomCommandChangeHandler} style={{ flexGrow: 1 }}></GsInput>
          <GsButton onClick={executeCustomCommand}>Send</GsButton>
        </div>
        <div className="row buttons">
          <GsButton onClick={() => { executeCommand('IMPROVE') }}>Improve</GsButton>
          <GsButton onClick={() => { executeCommand('REFORMULATE') }}>Reformulate</GsButton>
          <GsButton onClick={() => { executeCommand('SUMMARIZE') }}>Summarize</GsButton>
          <GsButton onClick={() => { executeCommand('EXTEND') }}>Extend</GsButton>
          <GsButton onClick={() => { dispatch({ type: 'UNDO' }) }} disabled={!editorState.undoStack.length}>Undo</GsButton>
          <GsButton onClick={() => { dispatch({ type: 'REDO' }) }} disabled={!editorState.redoStack.length}>Redo</GsButton>
          <GsButton onClick={restart}>New</GsButton>
        </div>
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
