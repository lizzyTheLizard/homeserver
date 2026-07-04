'use client'

import Markdown from 'react-markdown'
import { EditableBlock } from './EditableBlock'
import styles from './AiMessageBubble.module.css'

const markdownComponents = {
  code({ className, children }: React.ComponentPropsWithoutRef<'code'>) {
    if (className?.includes('language-input')) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const content = String(Array.isArray(children) ? children.join('') : children ?? '')
      return <EditableBlock content={content} />
    }
    return <code className={className}>{children}</code>
  },
}

export function AiMessageBubble({ role, content, typing }: { role: string, content: string, typing?: boolean }) {
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
