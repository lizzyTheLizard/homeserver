'use client'

import { DateTime } from '@/app/shared/_components/DateTime'
import type { Message } from '@assistant/whatsapp/types'
import styles from './MessageBubble.module.css'

export function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`${styles.bubble} ${message.fromMe ? styles.received : styles.sent}`}>
      {!message.fromMe && <div className={styles.senderName}>{message.fromName}</div>}
      <div className={styles.content}>
        {message.content}
      </div>
      <div className={styles.timestamp}>
        <DateTime date={message.messageTimestamp} oneLine />
      </div>
    </div>
  )
}
