'use client'

import { useState, useEffect, useCallback } from 'react'
import { AiChatMessageList, Message } from './AiChatMessageList'
import { AiActionsList } from './AiActionsList'
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator'
import { MAX_RECONNECT_ATTEMPTS, useAiChatWebSocket } from './AiChatWebSocket'
import styles from './AiChatWindow.module.css'
import { getLocation } from '../_helper/location'

export function AiChatWindow() {
  const [messages, setMessages] = useState<Message[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [input, setInput] = useState('')

  const onMessage = useCallback((message: string) => { setMessages(prev => [...prev, { role: 'assistant', content: message, id: prev.length }]) }, [])
  const onActions = useCallback((actions: string[]) => { setActions(actions) }, [])
  const getInitialContext = useCallback(async () => ({ location: await getLocation() }), [])

  const { terminateWebSocket, connectWebSocket, sendMessage, ...ws } = useAiChatWebSocket({ onMessage, onActions, getInitialContext })
  const canInput = ws.state === 'ready'
  const canSend = canInput && input.trim().length > 0

  useEffect(() => {
    connectWebSocket()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(() => [])
    setActions(() => [])
    return () => { terminateWebSocket() }
  }, [connectWebSocket, terminateWebSocket])

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
    sendMessage(t)
  }

  function handleRestart() {
    setMessages(() => [])
    setActions([])
    terminateWebSocket()
    connectWebSocket()
  }

  return (
    <div className={styles.window}>
      <AiChatMessageList
        messages={messages}
        state={ws.state}
        incomingMessage={ws.incomingMessage}
        onEdit={handleEdit}
      />
      <ConnectionStatusIndicator
        state={ws.state}
        attempt={ws.reconnectAttempt}
        maxAttempts={MAX_RECONNECT_ATTEMPTS}
        countdown={ws.reconnectCountdown}
        onRetry={connectWebSocket}
        onRestart={handleRestart}
      />
      <AiActionsList state={ws.state} actions={actions} onSend={send} />
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
