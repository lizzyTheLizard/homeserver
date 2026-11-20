'use client'

import { AiChatMessageList, type Message } from './AiChatMessageList'
import { AiChatWebSocket, type ChatState } from './AiChatWebSocket'
import { useEffect, useRef, useState } from 'react'
import { AiChatInput } from '@/app/shared/_components/chat/AiChatInput'
import { Icon } from '@/app/shared/_components/Icon'
import { getLocation } from '../_helper/location'
import styles from './AiChatWindow.module.css'

export function AiChatWindow({ loading = false }: { loading?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]),
   [actions, setActions] = useState<string[]>([]),
   [input, setInput] = useState(''),
   [state, setState] = useState<ChatState>({ type: 'initial' }),
   [incomingMessage, setIncomingMessage] = useState(''),
   webSocketRef = useRef<AiChatWebSocket | undefined>(undefined),

   canInput = state.type === 'ready',
   retryLabel = state.type === 'wait-for-reconnecting'
    ? 'Retry now'
    : state.type === 'automatic-reconnecting-exhausted'
      ? 'Retry again'
      : undefined

  useEffect(() => {
    const websocket = connectWebSocket()
    webSocketRef.current = websocket
    return () => {
      webSocketRef.current?.terminate()
      webSocketRef.current = undefined
    }
  }, [])

  function connectWebSocket(): AiChatWebSocket {
    const websocket = new AiChatWebSocket({ location: getLocation() })
    websocket.onNewMessage = (str) => { setMessages(prev => [...prev, { content: str, id: prev.length, role: 'assistant' }]) }
    websocket.onNewActions = (actions) => { setActions(actions) }
    websocket.onStateChange = (state) => { setState(state) }
    websocket.onIncomingMessageChange = (message) => { setIncomingMessage(message) }
    websocket.connect()
    return websocket
  }

  function handleEdit(editedText: string) {
    send(`I updated the text\n~~~input\n${editedText}\n~~~`)
  }

  function send(text: string) {
    const t = text.trim()
    if (!t) {return}
    setInput('')
    setMessages(prev => [...prev, { content: text, id: prev.length, role: 'user' }])
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

  function handleRetry() {
    webSocketRef.current?.forceReconnect()
  }

  return (
    <div className={styles.window}>
      <div className={styles.header}>
        {retryLabel && (
          <button className={styles.restartButton} onClick={handleRetry} title="Retry connection">
            <Icon name="reconnect" style={{ height: 14, width: 14 }} />
            {retryLabel}
          </button>
        )}
        <button className={styles.restartButton} onClick={handleRestart} title="Restart conversation">
          <Icon name="restart" style={{ height: 14, width: 14 }} />
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
      <AiChatInput
        value={input}
        onChange={setInput}
        onSubmit={send}
        disabled={!canInput}
        placeholder="Ask me anything…"
        status={loading ? undefined : state}
        actions={state.type === 'ready' ? actions.map(action => ({ label: action })) : undefined}
      />
    </div>
  )
}
