'use client'

import { Icon } from '../Icon'
import styles from './AiConnectionStatusIndicator.module.css'
import type { ChatState } from './AiChatState'

export interface AiConnectionStatusIndicatorProps {
  state: ChatState
}

export function AiConnectionStatusIndicator({ state }: AiConnectionStatusIndicatorProps) {
  if (state.type !== 'reconnect-impossible') return null

  return (
    <div className={styles.container}>
      <div className={styles.message}>
        <div className={`${styles.bubble} ${styles.bubbleRed}`}>
          <div className={styles.iconWrapper}>
            <Icon name="fatal" className={styles.iconRed} />
          </div>
          <span className={styles.textRed}>The conversation has ended. Please restart the session.</span>
        </div>
      </div>
    </div>
  )
}
