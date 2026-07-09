'use client'

import { Icon } from '@/app/shared/_components/Icon'
import styles from './ConnectionStatusIndicator.module.css'

export interface ConnectionStatusIndicatorProps {
  state: 'cannot-start' | 'reconnecting' | 'retries-exhausted' | 'no-retry'
  attempt?: number
  maxAttempts: number
  countdown?: number
  onRetry: () => void
  onRestart: () => void
}

export function ConnectionStatusIndicator(props: ConnectionStatusIndicatorProps) {
  const bubbleColorClass = props.state === 'reconnecting' ? styles.bubbleAmber : styles.bubbleRed
  const textClass = props.state === 'reconnecting' ? styles.textAmber : styles.textRed
  const iconClass = props.state === 'reconnecting' ? styles.iconAmber : styles.iconRed
  let iconName: 'error' | 'fatal' | 'reconnect'
  let textContent: string
  let retryLabel: string | undefined

  switch (props.state) {
    case 'cannot-start':
      iconName = 'error'
      textContent = 'Unable to establish a connection to the server. Please check your network and try again.'
      break
    case 'reconnecting':
      iconName = 'reconnect'
      textContent = `Connection lost. Reconnecting in ${String(props.countdown)}s — attempt ${String(props.attempt)} of ${String(props.maxAttempts)}.`
      retryLabel = 'Retry now'
      break
    case 'retries-exhausted':
      iconName = 'fatal'
      textContent = `Connection failed after ${String(props.maxAttempts)} attempts. The server could not be reached.`
      retryLabel = 'Retry again'
      break
    case 'no-retry':
      iconName = 'fatal'
      textContent = 'Connection failed, reconnection is not possible. Please restart the session.'
      break
  }

  return (
    <div className={styles.container}>
      <div className={styles.message}>
        <div className={styles.bubble + ' ' + bubbleColorClass}>
          <div className={styles.iconWrapper}>
            <Icon name={iconName} className={iconClass} />
          </div>
          <span className={textClass}>{textContent}</span>
        </div>
      </div>
      <div className={styles.buttons}>
        {retryLabel && <button className={styles.actionButton} onClick={props.onRetry}>{retryLabel}</button>}
        <button className={styles.actionButton} onClick={props.onRestart}>Restart the session</button>
      </div>
    </div>
  )
}
