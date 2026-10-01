'use client'

import { useEffect, useRef } from 'react'
import { AiMessageBubble } from '@/app/startpage/_components/AiMessageBubble'
import { PredefinedCommandType } from '../../_data/Command'
import { Button } from '@/app/shared/_components/form/Button'
import { Input } from '@/app/shared/_components/form/Input'
import { ChatMessage, predefinedCommandLabel } from '../_helper/Editor.state'
import style from './EditorChat.module.css'

const PROPOSED_ACTIONS: PredefinedCommandType[] = ['IMPROVE', 'REFORMULATE', 'SUMMARIZE', 'EXTEND']

export interface EditorChatProps {
  messages: ChatMessage[]
  contextValid: boolean
  customCommand: string
  error: string | undefined
  onCustomCommandChange: (value: string) => void
  onCustomCommandKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onSend: () => void
  onAction: (command: PredefinedCommandType) => void
}

export function EditorChat({ messages, contextValid, customCommand, error, onCustomCommandChange, onCustomCommandKeyDown, onSend, onAction }: EditorChatProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  return (
    <div className={style.chat}>
      <div ref={listRef} className={style.messageList}>
        {messages.map(message => (
          <AiMessageBubble key={message.id} role={message.role} content={message.content} />
        ))}
      </div>
      <div className={style.actions}>
        {PROPOSED_ACTIONS.map(action => (
          <button key={action} className={style.chip} disabled={!contextValid} onClick={() => { onAction(action) }}>
            {predefinedCommandLabel(action)}
          </button>
        ))}
      </div>
      <div className={style.inputRow}>
        <Input
          value={customCommand}
          onChange={(e) => { onCustomCommandChange(e.currentTarget.value) }}
          onKeyDown={(e) => { onCustomCommandKeyDown(e) }}
          label="Custom Command"
          disabled={!contextValid}
        />
        <Button onClick={() => { onSend() }} disabled={!contextValid || !customCommand}>Send</Button>
      </div>
      {error && <div className={style.error}>{'Could not execute command: ' + error}</div>}
    </div>
  )
}
