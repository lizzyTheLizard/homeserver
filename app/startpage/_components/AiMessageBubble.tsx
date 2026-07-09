'use client'

import Markdown from 'react-markdown'
import { EditableBlock } from './EditableBlock'
import styles from './AiMessageBubble.module.css'

export interface AiMessageBubbleProps {
  role: string
  content: string
  generating?: boolean
  stalled?: boolean
  editable?: boolean
  onEdit?: (editedText: string) => void
}

export function AiMessageBubble({ role, content, generating, stalled, editable, onEdit }: AiMessageBubbleProps) {
  const hasMessage = content.trim().length > 0
  const showGenerating = generating && hasMessage
  const messageClass = role === 'assistant' ? styles.aiMessage : styles.userMessage

  function codeComponent({ className, children }: React.ComponentPropsWithoutRef<'code'>) {
    if (!className?.includes('language-input')) return <code className={className}>{children}</code>
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const text = String(Array.isArray(children) ? children.join('') : children ?? '')
    const response = role === 'user'
    return <EditableBlock key={'input_' + text} content={text} onEdit={onEdit} editable={editable} response={response} />
  }

  const label = stalled ? <StalledLabel /> : showGenerating ? <GeneratingLabel /> : null

  let bubbleClass = role === 'assistant' ? styles.aiBubble : styles.userBubble
  if (stalled) bubbleClass += ' ' + styles.stalledBubble
  if (!hasMessage) bubbleClass += ' ' + styles.typingBubble

  let mainContent = <Markdown components={{ code: codeComponent }}>{content}</Markdown>
  if (!hasMessage) mainContent = <TypingIndicator stalled={stalled} />
  if (showGenerating) mainContent = <TemporaryContent content={content} stalled={stalled} />

  return (
    <div className={messageClass}>
      <div className={styles.labelWrapper}>
        <div className={bubbleClass}>
          {mainContent}
        </div>
        {label}
      </div>
    </div>
  )
}

function TemporaryContent({ content, stalled }: { content: string, stalled?: boolean }) {
  const cursorClass = styles.cursor + ' ' + (stalled ? styles.cursorStalled : styles.cursorActive)
  return (
    <>
      <span className={styles.partialText}>{content}</span>
      <span className={cursorClass} />
    </>
  )
}

function TypingIndicator({ stalled }: { stalled?: boolean }) {
  const dotClass = stalled ? styles.dotStalled : styles.dot
  return (
    <>
      <span className={dotClass} />
      <span className={dotClass} style={{ animationDelay: '0.18s' }} />
      <span className={dotClass} style={{ animationDelay: '0.36s' }} />
    </>
  )
}

function GeneratingLabel() {
  return (
    <div className={styles.generatingLabel}>
      <span className={styles.dotStream} />
      <span className={styles.dotStream} style={{ animationDelay: '0.25s' }} />
      <span className={styles.dotStream} style={{ animationDelay: '0.5s' }} />
      <span>generating</span>
    </div>
  )
}

function StalledLabel() {
  return (
    <div className={styles.stalledLabel}>
      <WarningIcon />
      Connection slow — waiting for response
    </div>
  )
}

function WarningIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke="rgba(180,100,0,0.6)" strokeWidth="1.2" />
      <path d="M6 3.5v3" stroke="rgba(180,100,0,0.7)" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="6" cy="8.2" r="0.6" fill="rgba(180,100,0,0.6)" />
    </svg>
  )
}
