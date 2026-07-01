'use client'

import { useState, useEffect, useRef, useReducer } from 'react'
import styles from './AiChatWindow.module.css'
import { aiChatStateReducer, initialAiChatState } from './AiChatWindowState'
import { getLocation } from '../_external/weather'
import Markdown from 'react-markdown'

export function AiChatWindow() {
  const [state, dispatch] = useReducer(aiChatStateReducer, initialAiChatState)
  const [input, setInput] = useState('')
  const canSend = input.trim().length > 0
  const listRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<WebSocket | undefined>(undefined)

  useEffect(() => {
    const websocket = new WebSocket('/ws/assistant')
    websocket.onopen = async () => {
      const context = { location: await getLocation() }
      websocket.send(JSON.stringify({ type: 'initialize', initialContext: context }))
    }
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as { type: string, chunk?: string, actions?: string[], error?: string }
      if (data.type === 'stream_response') {
        dispatch({ type: 'RECEIVED', chunk: data.chunk })
      }
      else if (data.type === 'got_actions') {
        dispatch({ type: 'ACTIONS', actions: data.actions })
      }
      else if (data.type === 'error') {
        dispatch({ type: 'ERROR', error: data.error ?? 'Unknown error' })
      }
      else if (data.type === 'finished_response') {
        dispatch({ type: 'FINISH' })
      }
    }
    websocket.onerror = (error) => { dispatch({ type: 'ERROR', error: error }) }
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
    dispatch({ type: 'SEND', message: t })
    setInput('')
    socketRef.current?.send(JSON.stringify({ type: 'message', message: t }))
  }

  return (
    <div className={styles.window}>
      <div ref={listRef} className={styles.messageList}>
        {state.messages.map(msg => msg.role === 'assistant'
          ? (
              <div key={'message_' + msg.id.toString()} className={styles.aiMessage}>
                <div className={styles.aiBubble}>
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
            )
          : (
              <div key={'message_' + msg.id.toString()} className={styles.userMessage}>
                <div className={styles.userBubble}>{msg.content}</div>
              </div>
            ),
        )}

        {(state.current === 'working' || state.current === 'initializing') && state.currentMessage.trim().length === 0 && (
          <div className={styles.typingIndicator}>
            <span className={styles.dot} />
            <span className={styles.dot} style={{ animationDelay: '0.18s' }} />
            <span className={styles.dot} style={{ animationDelay: '0.36s' }} />
          </div>
        )}
        {(state.currentMessage.trim().length > 0) && (
          <div className={styles.aiMessage}>
            <div className={styles.aiBubble}>
              <Markdown>{state.currentMessage}</Markdown>
            </div>
          </div>
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
