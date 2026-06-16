'use client'

import { DateTime } from '@/app/shared/_components/DateTime'
import styles from './MessageBubble.module.css'
import { Contact, Message } from '../../_data/Chat'
import { getSenderName } from './helpers'

export function MessageBubble({ message, contacts }: { message: Message, contacts: Contact[] }) {
  const senderName = getSenderName(message, contacts)
  return (
    <div className={`${styles.bubble} ${message.sender_id ? styles.received : styles.sent}`}>
      {message.sender_id && <div className={styles.senderName}>{senderName}</div>}
      <div className={styles.content}>
        {message.content}
      </div>
      <div className={styles.timestamp}>
        <DateTime date={message.timestamp} oneLine />
      </div>
    </div>
  )
}
