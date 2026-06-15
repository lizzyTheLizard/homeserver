'use client'

import { DateTime } from '@/app/shared/_components/DateTime'
import styles from './MessageBubble.module.css'
import { Contact, LidMapping, Message } from '../../_data/Chat'
import { getSenderName } from '../../_helper/whatsapp'

export function MessageBubble({ message, contacts, lidMappings }: { message: Message, contacts: Contact[], lidMappings: LidMapping[] }) {
  const senderName = getSenderName(message, contacts, lidMappings)
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
