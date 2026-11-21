'use client'

import { useEffect, useRef, useState } from 'react'
import type { Message } from './AiChatMessageList'
import { AiChatMessageList } from './AiChatMessageList'
import { AiChatInput } from '@/app/shared/_components/chat/AiChatInput'
import { Icon } from '@/app/shared/_components/Icon'
import type { ChatState } from './AiChatWebSocket'
import { AiChatWebSocket } from './AiChatWebSocket'
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
  const retryLabel = state.type === 'wait-for-reconnecting' ? 'Retry now' : state.type === 'automatic-reconnecting-exhausted' ? 'Retry again' : undefined

  useEffect(() => {
    const websocket = connectWebSocket()
    webSocketRef.current = websocket
    return () => {
      webSocketRef.current?.terminate()
      webSocketRef.current = undefined
    }
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [])

  function connectWebSocket(): AiChatWebSocket {
    const websocket = new AiChatWebSocket({ location: getLocation() })
    websocket.onNewMessage = str => {
      setMessages(prev => [...prev, { role: 'assistant', content: str, id: prev.length }])
    }
    websocket.onNewActions = newActions => {
      setActions(newActions)
    }
    websocket.onStateChange = newState => {
      setState(newState)
    }
    websocket.onIncomingMessageChange = message => {
      setIncomingMessage(message)
    }
    websocket.connect()
    return websocket
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
    console.debug('Restarting websocket connection')
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
            <Icon name="reconnect" style={{ width: 14, height: 14 }} />
            {retryLabel}
          </button>
        )}
        <button className={styles.restartButton} onClick={handleRestart} title="Restart conversation">
          <Icon name="restart" style={{ width: 14, height: 14 }} />
          Restart
        </button>
      </div>
      <AiChatMessageList messages={messages} state={state} incomingMessage={incomingMessage} onEdit={handleEdit} hasActions={actions.length > 0} />
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
