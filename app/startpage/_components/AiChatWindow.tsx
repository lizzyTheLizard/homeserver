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

  function connectWebSocket(): AiChatWebSocket {
    const websocket = new AiChatWebSocket(() => getLocation().then(location => ({ location })))
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
    setMessages(prev => [...prev, { role: 'user', content: text, id: prev.length }])
    setActions([])
    webSocketRef.current?.sendMessage(t)
  }

  function handleRestart() {
    console.log('Restarting websocket connection')
    webSocketRef.current?.terminate()
    webSocketRef.current = undefined
    setMessages(() => [])
    setActions([])
    setState({ type: 'initial' })
    setIncomingMessage('')
    const websocket = connectWebSocket()
    webSocketRef.current = websocket
  }

  return (
    <div className={styles.window}>
      <AiChatMessageList
        messages={messages}
        state={state}
        incomingMessage={incomingMessage}
        onEdit={handleEdit}
      />
      {!loading && (
        <AiConnectionStatusIndicator
          state={state}
          onRetry={connectWebSocket}
          onRestart={handleRestart}
        />
      )}
      <AiActionsList state={state} actions={actions} onSend={send} />
      <form onSubmit={handleSubmit} className={styles.inputRow}>
        <input
          disabled={!canInput}
          value={input}
          onChange={(e) => { setInput(e.target.value) }}
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
