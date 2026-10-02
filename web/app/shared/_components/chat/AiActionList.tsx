'use client'

import styles from './AiActionList.module.css'

export interface AiActionListAction {
  label: string
  onSelect: () => void
}

export interface AiActionListProps {
  actions: AiActionListAction[]
  disabled?: boolean
}

export function AiActionList({ actions, disabled = false }: AiActionListProps) {
  return (
    <div className={styles.chips}>
      {actions.map((action, index) => (
        <button
          key={`action_${String(index)}`}
          type="button"
          className={styles.chip}
          disabled={disabled}
          onClick={() => { action.onSelect() }}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}