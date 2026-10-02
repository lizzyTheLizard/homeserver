'use client'

import { Icon } from '../Icon'
import styles from './AiConnectionStatusIndicator.module.css'
import { ChatState } from './AiChatState'

export interface AiConnectionStatusIndicatorProps {
  state: ChatState
}

export function AiConnectionStatusIndicator({ state }: AiConnectionStatusIndicatorProps) {
  let iconName: 'error' | 'fatal' | 'reconnect'
  let textContent: string
  let warn = false

  switch (state.type) {
    case 'wait-for-reconnecting':
      iconName = 'reconnect'
      textContent = `Connection lost. Reconnecting in ${String(state.inSeconds)}s — attempt ${String(state.nextAttempt)} of ${String(state.maxAttempts)}.`
      warn = true
      break
    case 'reconnecting':
      iconName = 'reconnect'
      textContent = `Reconnecting...`
      warn = true
      break
    case 'automatic-reconnecting-exhausted':
      iconName = 'fatal'
      textContent = `Connection lost, could not reconnect after ${String(state.maxAttempts)} attempts. The server could not be reached.`
      break
    case 'reconnect-impossible':
      iconName = 'fatal'
      textContent = 'Connection failed, reconnection is not possible. Please restart the session.'
      break
    default:
      return null
  }

  const textClass = warn ? styles.textAmber : styles.textRed
  const iconClass = warn ? styles.iconAmber : styles.iconRed
  const bubbleColorClass = warn ? styles.bubbleAmber : styles.bubbleRed

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
    </div>
  )
}