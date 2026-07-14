'use client'
import { useState } from 'react'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { textColumn, boolColumn, dateColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { loadMessage } from '../server'
import { DateTime } from '@/app/shared/_components/DateTime'
import styles from './MicrosoftMail.module.css'
import type { SerializedMessageListItem, SerializedMessageFull } from '../server'

export function MicrosoftMail({ messages }: { messages: SerializedMessageListItem[] }) {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [fullMessage, setFullMessage] = useState<SerializedMessageFull | null>(null)
  const [messageLoading, setMessageLoading] = useState(false)
  const [emailSidebarId, openEmailSidebar] = useSidebar()

  function showMessageDetails(msg: MessagePlus) {
    setSelectedMessageId(msg.subject)
    setFullMessage(null)
    setMessageLoading(true)
    loadMessage(msg.id).then((data) => {
      setFullMessage(data ?? null)
      setMessageLoading(false)
      openEmailSidebar()
    }).catch(() => {
      setMessageLoading(false)
      openEmailSidebar()
    })
  }

  return (
    <>
      <DataTable
        data={messages.map(msg => formatEmail(msg))}
        columns={emailColumns}
        onRowClick={showMessageDetails}
        initialSortingOrder={[{ key: 'receivedDateTime', direction: 'DESC' }]}
        searchLabel="Search emails…"
      />
      <Sidebar id={emailSidebarId} title={selectedMessageId ?? ''} type="Email" noDelete>
        {messageLoading && <LoadingSpinner text="Loading email..." />}
        {!messageLoading && fullMessage && (
          <div className={styles.emailContent}>
            <div className={styles.emailField}>
              <strong>From: </strong>
              {fullMessage.from.emailAddress.name ?? fullMessage.from.emailAddress.address}
            </div>
            <div className={styles.emailField}>
              <strong>To: </strong>
              {fullMessage.toRecipients.map(r => r.emailAddress.name ?? r.emailAddress.address).join(', ')}
            </div>
            <div className={styles.emailField}>
              <strong>Date: </strong>
              <DateTime date={fullMessage.receivedDateTime} oneLine />
            </div>
            <div className={styles.emailBodyPreview}>{fullMessage.bodyPreview}</div>
            <div className={styles.emailBodyPreview}>{fullMessage.body.content}</div>
          </div>
        )}
        {!messageLoading && !fullMessage && <p>No message could be loaded.</p>}
      </Sidebar>
    </>
  )
}

const emailColumns = [
  textColumn('fromAddress', { header: 'Sender', style: {} }),
  textColumn('subject', { header: 'Subject', style: {} }),
  dateColumn('receivedDateTime', { header: 'Timestamp', style: { width: '15%' } }),
  boolColumn('isRead', { header: 'Read', style: { width: '8%' } }),
  boolColumn('isFocus', { header: 'Focus', style: { width: '8%' } }),
]

interface MessagePlus {
  id: string
  subject: string
  fromAddress: string
  isFocus: boolean
  receivedDateTime: string
  isRead: boolean
}

function formatEmail(msg: SerializedMessageListItem): MessagePlus {
  return {
    ...msg,
    fromAddress: msg.from.emailAddress.address,
    isFocus: msg.inferenceClassification === 'focused',
    receivedDateTime: msg.receivedDateTime,
  }
}
