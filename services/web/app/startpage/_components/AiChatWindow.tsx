'use client'

import { useEffect, useRef, useState } from 'react'
import type { Message } from './AiChatMessageList'
import { AiChatMessageList } from './AiChatMessageList'
import { AiChatInput } from '@/app/shared/_components/chat/AiChatInput'
import { Icon } from '@/app/shared/_components/Icon'
import type { ChatState } from './AiChatConnection'
import { AiChatConnection } from './AiChatConnection'
import styles from './AiChatWindow.module.css'
import { getLocation } from '../_helper/location'

export function AiChatWindow({ loading = false }: { loading?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [state, setState] = useState<ChatState>({ type: 'initial' })
  const [incomingMessage, setIncomingMessage] = useState('')
  const connectionRef = useRef<AiChatConnection | undefined>(undefined)

  const canInput = state.type === 'ready'

  useEffect(() => {
    const connection = startConnection()
    connectionRef.current = connection
    return () => {
      connectionRef.current?.terminate()
      connectionRef.current = undefined
    }
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [])

  function startConnection(): AiChatConnection {
    const connection = new AiChatConnection({ location: getLocation() })
    connection.onNewMessage = str => {
      setMessages(prev => [...prev, { role: 'assistant', content: str, id: prev.length }])
    }
    connection.onNewActions = newActions => {
      setActions(newActions)
    }
    connection.onStateChange = newState => {
      setState(newState)
    }
    connection.onIncomingMessageChange = message => {
      setIncomingMessage(message)
    }
    connection.start()
    return connection
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
    connectionRef.current?.sendMessage(t)
  }

  function handleRestart() {
    console.debug('Restarting connection connection')
    connectionRef.current?.terminate()
    connectionRef.current = undefined
    setMessages(() => [])
    setActions([])
    setState({ type: 'initial' })
    setIncomingMessage('')
    const connection = startConnection()
    connectionRef.current = connection
  }

  return (
    <div className={styles.window}>
      <div className={styles.header}>
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
