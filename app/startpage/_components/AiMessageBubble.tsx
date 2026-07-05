'use client'

import Markdown from 'react-markdown'
import { EditableBlock } from './EditableBlock'
import { type Selection } from '@/app/shared/_components/form/Textarea'
import styles from './AiMessageBubble.module.css'

export function AiMessageBubble({ role, content, typing, editable, onEdit, onSelectionChange }: { role: string, content: string, typing?: boolean, editable?: boolean, onEdit?: (editedText: string) => void, onSelectionChange?: (selection?: Selection) => void }) {
  const markdownComponents = {
    code({ className, children }: React.ComponentPropsWithoutRef<'code'>) {
      if (!className?.includes('language-input')) return <code className={className}>{children}</code>
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const text = String(Array.isArray(children) ? children.join('') : children ?? '')
      return <EditableBlock content={text} onEdit={onEdit} onSelectionChange={onSelectionChange} editable={editable} />
    },
  }
  if (typing) return (
    <div className={styles.typingIndicator}>
      <span className={styles.dot} />
      <span className={styles.dot} style={{ animationDelay: '0.18s' }} />
      <span className={styles.dot} style={{ animationDelay: '0.36s' }} />
    </div>
  )
  return (
    <div className={role === 'assistant' ? styles.aiMessage : styles.userMessage}>
      <div className={role === 'assistant' ? styles.aiBubble : styles.userBubble}>
        <Markdown components={role === 'assistant' ? markdownComponents : undefined}>{content}</Markdown>
      </div>
    </div>
  )
}
