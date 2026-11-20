'use client'
import { connectMicrosoft, disconnectMicrosoft } from '../server'
import { ActionButton } from '@/app/shared/_components/ActionButton'
import { Button } from '@/app/shared/_components/form/Button'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import type { MicrosoftUserInfo } from '@assistant/microsoft/types'
import styles from './MicrosoftUserInfo.module.css'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface MicrosoftUserInfoParam {
  connected: boolean
  userInfo?: MicrosoftUserInfo
}

export function MicrosoftUserInfo({ connected, userInfo }: MicrosoftUserInfoParam) {
  const searchParams = useSearchParams(),
   [error, setError] = useState<string | undefined>(searchParams.get('error') ?? undefined),
   [loading, setLoading] = useState(false)

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

  if (loading) {return (<LoadingSpinner />)}

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
