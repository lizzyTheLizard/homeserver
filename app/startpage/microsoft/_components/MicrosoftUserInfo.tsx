'use client'
import { useState } from 'react'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Button } from '@/app/shared/_components/form/Button'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { connectMicrosoft, disconnectMicrosoft } from '../server'
import { useSearchParams } from 'next/navigation'
import styles from './MicrosoftUserInfo.module.css'
import type { MicrosoftUserInfo as MSUserInfo } from '../../_external/microsoft'

interface MicrosoftUserInfoParam {
  connected: boolean
  userInfo?: MSUserInfo
}

export function MicrosoftUserInfo({ connected, userInfo }: MicrosoftUserInfoParam) {
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
    <ActionButton onClick={() => { void handleDisconnect() }}>
      Disconnect (
      {userInfo?.mail ?? 'Unknown'}
      )
    </ActionButton>
  )
}
