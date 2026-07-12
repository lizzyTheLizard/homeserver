'use client'
import { ReactNode, useState } from 'react'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { textColumn, boolColumn, dateColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { useSidebar } from '@/app/shared/_components/sidebar/SidebarContext'
import { Sidebar } from '@/app/shared/_components/sidebar/Sidebar'
import { connectMicrosoft, disconnectMicrosoft, loadMessage } from '../server'
import { Button } from '@/app/shared/_components/form/Button'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { useSearchParams } from 'next/navigation'
import styles from './MicrosoftContent.module.css'
import type { MicrosoftMessageListItem, MicrosoftUserInfo, MicrosoftMessageFull } from '../../_external/microsoft'

const columns = [
  textColumn('fromAddress', { header: 'Sender', style: {} }),
  textColumn('subject', { header: 'Subject', style: {} }),
  dateColumn('receivedDateTime', { header: 'Timestamp', style: { width: '15%' } }),
  boolColumn('isRead', { header: 'Read', style: { width: '8%' } }),
  boolColumn('isFocus', { header: 'Focus', style: { width: '8%' } }),
]

export function MicrosoftContent({ status }: { status: { connected: boolean, userInfo?: MicrosoftUserInfo, messages: MicrosoftMessageListItem[] } }) {
  const { connected, userInfo, messages } = status
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [fullMessage, setFullMessage] = useState<MicrosoftMessageFull | null>(null)
  const [messageLoading, setMessageLoading] = useState(false)
  const [sidebarId, openSidebar] = useSidebar()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | undefined>(searchParams.get('error') ?? undefined)
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    setError(undefined)
    const result = await connectMicrosoft()
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }
    window.location.href = result.data
  }

  async function handleDisconnect() {
    setLoading(true)
    setError(undefined)
    const result = await disconnectMicrosoft()
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }
    window.location.reload()
  }

  function showMessageDetails(msg: MessagePlus) {
    setSelectedMessageId(msg.subject)
    setFullMessage(null)
    setMessageLoading(true)
    loadMessage(msg.id).then((data) => {
      setFullMessage(data ?? null)
      setMessageLoading(false)
      openSidebar()
    }).catch(() => {
      setMessageLoading(false)
      openSidebar()
    })
  }

  function renderMobile(msg: MessagePlus): ReactNode {
    return (
      <div key={msg.id} className={styles.mobileItem} onClick={() => { showMessageDetails(msg) }}>
        <div className={styles.mobileItemName}>
          {msg.subject}
        </div>
        <div className={styles.mobileDesc}>
          {msg.fromAddress}
          {' '}
          &bull;
          {new Date(msg.receivedDateTime).toLocaleString()}
          {msg.isRead ? '' : ' &bull; Unread'}
        </div>
      </div>
    )
  }

  if (loading) return (<LoadingSpinner></LoadingSpinner>)

  if (!connected) {
    return (
      <div className={styles.container}>
        <div className={styles.status}>Not connected</div>
        <p className={styles.description}>Connect your Microsoft account to access Outlook emails, search your archive, and send messages from the AI assistant.</p>
        {error && <div className={styles.error}>{error}</div>}
        <Button onClick={() => { void handleConnect() }} type="button" className={styles.button}>Connect Microsoft Account</Button>
      </div>
    )
  }

  return (
    <>
      <DataTable
        data={messages.map(msg => format(msg))}
        columns={columns}
        onRowClick={showMessageDetails}
        initialSortingOrder={[{ key: 'receivedDateTime', direction: 'DESC' }]}
        renderMobile={renderMobile}
        searchLabel="Search emails…"
      />
      <Sidebar id={sidebarId} title={selectedMessageId ?? ''} type="Email" noDelete>
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
              {new Date(fullMessage.receivedDateTime).toLocaleString()}
            </div>
            <div className={styles.emailBodyPreview}>{fullMessage.bodyPreview}</div>
            <div className={styles.emailBody} dangerouslySetInnerHTML={{ __html: fullMessage.body.content }} />
          </div>
        )}
        {!messageLoading && !fullMessage && <p>No message could be loaded.</p>}
      </Sidebar>
      <ActionButton onClick={() => { void handleDisconnect() }}>
        Disconnect (
        {userInfo?.mail ?? 'Unknown'}
        )
      </ActionButton>
    </>
  )
}

interface MessagePlus extends MicrosoftMessageListItem {
  fromAddress: string
  isFocus: boolean
}

function format(msg: MicrosoftMessageListItem): MessagePlus {
  return {
    ...msg,
    fromAddress: msg.from.emailAddress.address,
    isFocus: msg.inferenceClassification === 'focused',
  }
}
