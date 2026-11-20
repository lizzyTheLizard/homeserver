'use client'

import { useEffect, useRef } from 'react'
import { AiMessageBubble } from '@/app/shared/_components/chat/AiMessageBubble'
import type { ChatState } from './AiChatWebSocket'
import styles from './AiChatMessageList.module.css'

export interface Message {
  id: number
  role: 'assistant' | 'user'
  content: string
}

export interface AiChatMessageListProps {
  messages: Message[]
  state: ChatState
  incomingMessage: string
  onEdit: (editedText: string) => void
  hasActions: boolean
}

export function AiChatMessageList({ messages, state, incomingMessage, hasActions, onEdit }: AiChatMessageListProps) {
  const listRef = useRef<HTMLDivElement>(null),
   ready = state.type === 'ready',
   incomming = state.type === 'waiting-for-response' || state.type === 'connecting',
   stalled = state.type === 'waiting-for-response' && state.stalled

  useEffect(() => {
    if (listRef.current && listRef.current.clientWidth > 600)
      {listRef.current.scrollTop = listRef.current.scrollHeight}
    else
      {window.scrollTo(0, document.body.scrollHeight)}
  }, [messages, incomingMessage, incomming, stalled, hasActions])

  return (
    <div ref={listRef} className={styles.messageList}>
      {messages.map((msg, index) => {
        const editable = ready && msg.role === 'assistant' && index === messages.length - 1
        return (
          <AiMessageBubble
            key={`message_${  msg.id.toString()}`}
            role={msg.role}
            content={msg.content}
            editable={editable}
            onEdit={onEdit}
          />
        )
      })}
      {incomming && (<AiMessageBubble role="assistant" content={incomingMessage} generating stalled={stalled} />)}
    </div>
  )
}
