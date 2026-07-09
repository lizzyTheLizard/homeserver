'use client'

import styles from './AiActionsList.module.css'
import { ChatState } from './AiChatWebSocket'

interface AiActionsListProps {
  state: ChatState
  actions: string[]
  onSend: (text: string) => void
}

export function AiActionsList({ state, actions, onSend }: AiActionsListProps) {
  if (state !== 'ready') return null

  return (
    <div className={styles.chips}>
      {actions.map((a, index) => (
        <button key={'action_' + index.toString()} onClick={() => { onSend(a) }} className={styles.chip}>{a}</button>
      ))}
    </div>
  )
}
