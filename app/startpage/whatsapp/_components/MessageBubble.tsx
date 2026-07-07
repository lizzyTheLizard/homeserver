'use client'

import { DateTime } from '@/app/shared/_components/DateTime'
import styles from './MessageBubble.module.css'
import type { Message } from '@lizzythelizard/whatsapp-mcp'

export function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`${styles.bubble} ${message.from ? styles.received : styles.sent}`}>
      {message.from && <div className={styles.senderName}>{message.from.name}</div>}
      <div className={styles.content}>
        {message.message}
      </div>
      <div className={styles.timestamp}>
        <DateTime date={{ epochMilliseconds: message.messageTimestamp }} oneLine />
      </div>
    </div>
  )
}
