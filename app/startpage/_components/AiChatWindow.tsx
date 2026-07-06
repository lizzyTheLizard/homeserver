'use client'

import { useState, useEffect, useRef, useReducer } from 'react'
import { aiChatStateReducer, initialAiChatState } from './AiChatWindowState'
import { getLocation } from '../_external/weather'
import { AiMessageBubble } from './AiMessageBubble'
import styles from './AiChatWindow.module.css'

export function AiChatWindow() {
  const [state, dispatch] = useReducer(aiChatStateReducer, initialAiChatState)
  const [input, setInput] = useState('')
  const canSend = input.trim().length > 0
  const listRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<WebSocket | undefined>(undefined)

  useEffect(() => {
    console.log('Opening WebSocket connection to /ws/assistant')
    const websocket = new WebSocket('/ws/assistant')
    websocket.onopen = async () => {
      console.log('WebSocket connection opened')
      const context = { location: await getLocation() }
      websocket.send(JSON.stringify({ type: 'initialize', initialContext: context }))
    }
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as { type: string, chunk?: string, actions?: string[], error?: string }
      if (data.type === 'stream_response') dispatch({ type: 'RECEIVED', chunk: data.chunk })
      if (data.type === 'tool_call') dispatch({ type: 'TOOL_CALL' })
      if (data.type === 'got_actions') dispatch({ type: 'ACTIONS', actions: data.actions })
      if (data.type === 'error') dispatch({ type: 'ERROR', error: data.error ?? 'Unknown error' })
      if (data.type === 'finished_response') dispatch({ type: 'FINISH' })
    }
    websocket.onerror = (error) => { console.warn('WebSocket error:', error) }
    websocket.onclose = (event) => { console.log('WebSocket closed:', event.code, event.reason) }
    socketRef.current = websocket
    return () => { websocket.close() }
  }, [])

  // Always scroll to the bottom to show latest messages
  useEffect(() => {
    if (listRef.current) { listRef.current.scrollTop = listRef.current.scrollHeight }
  }, [state])

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    send(input)
  }

  function send(text: string) {
    const t = text.trim()
    if (!t) return
    const message = t
    dispatch({ type: 'SEND', message: t })
    setInput('')
    socketRef.current?.send(JSON.stringify({ type: 'message', message }))
  }

  function handleEdit(editedText: string) {
    const text = `I updated the text\n~~~input\n${editedText}\n~~~`
    send(text)
  }

  return (
    <div className={styles.window}>
      <div ref={listRef} className={styles.messageList}>
        {state.messages.map((msg, index) => (
          <AiMessageBubble
            key={'message_' + msg.id.toString()}
            role={msg.role}
            content={msg.content}
            editable={state.current !== 'working' && msg.role === 'assistant' && index === state.messages.length - 1}
            onEdit={handleEdit}
          />
        ))}
        {(state.current === 'working' || state.current === 'initializing') && state.currentMessage.trim().length === 0 && (
          <AiMessageBubble role="assistant" content="" typing={true} editable={false} />
        )}
        {(state.currentMessage.trim().length > 0) && (
          <AiMessageBubble role="assistant" content={state.currentMessage} editable={false} />
        )}
      </div>

      {state.actions.length > 0 && (
        <div className={styles.chips}>
          {state.actions.map((a, index) => (
            <button key={'action_' + index.toString()} onClick={() => { send(a) }} className={styles.chip}>{a}</button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.inputRow}>
        <input
          disabled={state.current !== 'ready'}
          value={input}
          onChange={(e) => { setInput(e.target.value) }}
          placeholder="Ask me anything…"
          className={styles.input}
        />
        <button type="submit" disabled={state.current !== 'ready'} className={styles.sendButton} data-active={canSend || undefined}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 11V2M2 6.5l4.5-4.5 4.5 4.5" stroke={canSend ? 'white' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  )
}
