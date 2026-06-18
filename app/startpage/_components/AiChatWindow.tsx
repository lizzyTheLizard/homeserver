'use client'

import { useState, useEffect, useRef, useReducer } from 'react'
import styles from './AiChatWindow.module.css'
import { aiChatStateReducer, initialAiChatState } from './AiChatWindowState'
import { InitialContext, Message } from '../_external/assistant/Message'
import { getLocation } from '../_external/assistant/WeatherPlugin'
import { ActionResponse } from '@/app/shared/_helper/ActionResponse'
import Markdown from 'react-markdown'

interface AiChatWindowProps {
  getInitialGreeting: (initialContext: InitialContext) => ActionResponse<{ messages: Message[], actions: string[] }>
  sendMessage: (messages: Message[]) => ActionResponse<{ messages: Message[], actions: string[] }>
}

export function AiChatWindow({ getInitialGreeting, sendMessage }: AiChatWindowProps) {
  const [state, dispatch] = useReducer(aiChatStateReducer, initialAiChatState)
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const canSend = input.trim().length > 0

  useEffect(() => {
    if (state.current !== 'initializing') return
    getInitialContext()
      .then(ctx => getInitialGreeting(ctx))
      .then((response) => {
        console.log('Initial greeting response:', response)
        if (response.success) { dispatch({ type: 'INITIALIZED', messages: response.data.messages, actions: response.data.actions }) }
        else { dispatch({ type: 'FAILED', error: response.error }) }
      })
      .catch((error: unknown) => { dispatch({ type: 'FAILED', error }) })
  }, [state, getInitialGreeting])

  // Always scroll to the top to show latest messages
  useEffect(() => {
    if (listRef.current) { listRef.current.scrollTop = 0 }
  }, [state])

  async function getInitialContext(): Promise<InitialContext> {
    return { location: await getLocation() }
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    send(input)
  }

  function send(text: string) {
    const t = text.trim()
    if (!t) return
    const message: Message = { id: state.messages.length, role: 'user', content: t, hidden: false }
    setInput('')
    dispatch({ type: 'SEND', message })
    console.log('Send message:', message)
    sendMessage([...state.messages, message])
      .then((response) => {
        console.log('Got response', response)
        if (response.success) { dispatch({ type: 'RECEIVED', messages: response.data.messages, actions: response.data.actions }) }
        else { dispatch({ type: 'FAILED', error: response.error }) }
      })
      .catch((error: unknown) => { dispatch({ type: 'FAILED', error }) })
  }

  return (
    <div className={styles.window}>
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

      {state.latestActions.length > 0 && (
        <div className={styles.chips}>
          {state.latestActions.map((a, index) => (
            <button key={'action_' + index.toString()} onClick={() => { send(a) }} className={styles.chip}>{a}</button>
          ))}
        </div>
      )}

      <div ref={listRef} className={styles.messageList}>
        {(state.current === 'typing' || state.current === 'initializing') && (
          <div className={styles.typingIndicator}>
            <span className={styles.dot} />
            <span className={styles.dot} style={{ animationDelay: '0.18s' }} />
            <span className={styles.dot} style={{ animationDelay: '0.36s' }} />
          </div>
        )}
        {state.messages.filter(m => 'content' in m).filter(m => !m.hidden).reverse().map(msg =>
          msg.role === 'assistant'
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
      </div>
    </div>
  )
}
