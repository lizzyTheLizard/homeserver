'use client'

import { Icon } from '@/app/shared/_components/Icon'
import styles from './AiConnectionStatusIndicator.module.css'
import { ChatState } from './AiChatWebSocket'

export interface AiConnectionStatusIndicatorProps {
  state: ChatState
  attempt?: number
  maxAttempts: number
  countdown?: number
  onRetry: () => void
  onRestart: () => void
}

export function AiConnectionStatusIndicator(props: AiConnectionStatusIndicatorProps) {
  const bubbleColorClass = props.state === 'reconnecting' ? styles.bubbleAmber : styles.bubbleRed
  let iconName: 'error' | 'fatal' | 'reconnect'
  let textContent: string
  let retryLabel: string | undefined
  let warn = false

  switch (props.state) {
    case 'wait-for-reconnecting':
      iconName = 'reconnect'
      textContent = `Connection lost. Reconnecting in ${String(props.countdown)}s — attempt ${String(props.attempt)} of ${String(props.maxAttempts)}.`
      retryLabel = 'Retry now'
      warn = true
      break
    case 'reconnecting':
      iconName = 'reconnect'
      textContent = `Reconnecting...`
      warn = true
      break
    case 'retries-exhausted':
      iconName = 'fatal'
      textContent = `Connection lost, could not reconnect after ${String(props.maxAttempts)} attempts. The server could not be reached.`
      retryLabel = 'Retry again'
      break
    case 'retry-impossible':
      iconName = 'fatal'
      textContent = 'Connection failed, reconnection is not possible. Please restart the session.'
      break
    default:
      return null
  }

  const textClass = warn ? styles.textAmber : styles.textRed
  const iconClass = warn ? styles.iconAmber : styles.iconRed

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
