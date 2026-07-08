'use client'
import { useState } from 'react'
import { connectMicrosoft, disconnectMicrosoft } from '../server'
import styles from './MicrosoftContent.module.css'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Button } from '@/app/shared/_components/form/Button'
import { useSearchParams } from 'next/navigation'
import type { MicrosoftUserInfo, MicrosoftMessage } from '../../_external/microsoft'

export function MicrosoftContent({ status }: { status: { connected: boolean, userInfo?: MicrosoftUserInfo, messages?: MicrosoftMessage[] } }) {
  const [connected, setConnected] = useState(status.connected)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | undefined>(searchParams.get('error') ?? undefined)

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
    setLoading(false)
    setConnected(false)
  }

  if (loading) return (<LoadingSpinner></LoadingSpinner>)

  if (connected) {
    return (
      <div className={styles.container}>
        <div className={styles.status}>Connected to Microsoft</div>
        {status.userInfo && (
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {status.userInfo.displayName.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{status.userInfo.displayName}</div>
              <div className={styles.userMail}>{status.userInfo.mail}</div>
            </div>
          </div>
        )}
        {status.messages && status.messages.length > 0 && (
          <div className={styles.messagesSection}>
            <h3 className={styles.messagesTitle}>Latest emails</h3>
            <div className={styles.messageList}>
              {status.messages.map(msg => (
                <div key={msg.id} className={styles.messageItem}>
                  <div className={styles.messageSubject}>{msg.subject}</div>
                  <div className={styles.messageMeta}>
                    <span className={styles.messageFrom}>{msg.from.emailAddress.address}</span>
                    <span className={styles.messageDate}>{formatDate(msg.receivedDateTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <Button onClick={() => { void handleDisconnect() }} type="button" className={styles.button}>Disconnect Microsoft Account</Button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.status}>Not connected</div>
      <p className={styles.description}>Connect your Microsoft account to access Outlook emails, search your archive, and send messages from the AI assistant.</p>
      {error && <div className={styles.error}>{error}</div>}
      <Button onClick={() => { void handleConnect() }} type="button" className={styles.button}>Connect Microsoft Account</Button>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
