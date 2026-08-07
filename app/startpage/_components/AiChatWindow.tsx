'use client'

import { useState, useEffect, useRef } from 'react'
import { AiChatMessageList, Message } from './AiChatMessageList'
import { AiActionsList } from './AiActionsList'
import { AiConnectionStatusIndicator } from './AiConnectionStatusIndicator'
import { AiChatWebSocket, ChatState } from './AiChatWebSocket'
import styles from './AiChatWindow.module.css'
import { getLocation } from '../_helper/location'

export function AiChatWindow({ loading = false }: { loading?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [state, setState] = useState<ChatState>({ type: 'initial' })
  const [incomingMessage, setIncomingMessage] = useState('')
  const webSocketRef = useRef<AiChatWebSocket | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const sentMessageHistory = useRef<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const editedHistory = useRef<string | null>(null)

  const canInput = state.type === 'ready'
  const canSend = canInput && input.trim().length > 0

  useEffect(() => {
    const websocket = connectWebSocket()
    webSocketRef.current = websocket
    return () => {
      webSocketRef.current?.terminate()
      webSocketRef.current = undefined
    }
  }, [])

  useEffect(() => {
    if (state.type === 'ready') {
      inputRef.current?.focus()
    }
  }, [state.type])

  function connectWebSocket(): AiChatWebSocket {
    const websocket = new AiChatWebSocket({ location: getLocation() })
    websocket.onNewMessage = (str) => { setMessages(prev => [...prev, { role: 'assistant', content: str, id: prev.length }]) }
    websocket.onNewActions = (actions) => { setActions(actions) }
    websocket.onStateChange = (state) => { setState(state) }
    websocket.onIncomingMessageChange = (message) => { setIncomingMessage(message) }
    websocket.connect()
    return websocket
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    send(input)
  }

  function handleEdit(editedText: string) {
    send(`I updated the text\n~~~input\n${editedText}\n~~~`)
  }

  function send(text: string) {
    const t = text.trim()
    if (!t) return
    setInput('')
    sentMessageHistory.current = [...sentMessageHistory.current, t]
    setHistoryIndex(-1)
    editedHistory.current = null
    setMessages(prev => [...prev, { role: 'user', content: text, id: prev.length }])
    setActions([])
    webSocketRef.current?.sendMessage(t)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const history = sentMessageHistory.current
      if (history.length === 0) return
      if (historyIndex === -1) {
        editedHistory.current = input
      }
      const nextIndex = Math.min(historyIndex + 1, history.length - 1)
      setHistoryIndex(nextIndex)
      setInput(history[history.length - 1 - nextIndex])
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex === -1) return
      if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput(editedHistory.current ?? '')
        editedHistory.current = null
      }
      else {
        const nextIndex = historyIndex - 1
        setHistoryIndex(nextIndex)
        setInput(sentMessageHistory.current[sentMessageHistory.current.length - 1 - nextIndex])
      }
    }
  }

  function handleRestart() {
    console.log('Restarting websocket connection')
    webSocketRef.current?.terminate()
    webSocketRef.current = undefined
    setMessages(() => [])
    setActions([])
    setState({ type: 'initial' })
    setIncomingMessage('')
    sentMessageHistory.current = []
    setHistoryIndex(-1)
    editedHistory.current = null
    const websocket = connectWebSocket()
    webSocketRef.current = websocket
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value)
    if (historyIndex >= 0) {
      setHistoryIndex(-1)
      editedHistory.current = null
    }
  }

  return (
    <div className={styles.window}>
      <div className={styles.header}>
        <button className={styles.restartButton} onClick={handleRestart} title="Restart conversation">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
          </svg>
          Restart
        </button>
      </div>
      <AiChatMessageList
        messages={messages}
        state={state}
        incomingMessage={incomingMessage}
        onEdit={handleEdit}
        hasActions={actions.length > 0}
      />
      {!loading && (
        <AiConnectionStatusIndicator
          state={state}
          onRetry={() => { webSocketRef.current?.forceReconnect() }}
          onRestart={handleRestart}
        />
      )}
      <AiActionsList state={state} actions={actions} onSend={send} />
      <form onSubmit={handleSubmit} className={styles.inputRow}>
        <input
          ref={inputRef}
          disabled={!canInput}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything…"
          className={styles.input}
        />
        <button type="submit" disabled={!canSend} className={styles.sendButton}>
          <SendIcon />
        </button>
      </form>
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className={styles.sendIcon}>
      <path d="M6.5 11V2M2 6.5l4.5-4.5 4.5 4.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
