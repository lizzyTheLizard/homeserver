'use client'

import { useEffect, useRef, useState } from 'react'
import { AiConnectionStatusIndicator } from './AiConnectionStatusIndicator'
import { Icon } from '../Icon'
import { ChatState } from './AiChatState'
import styles from './AiChatInput.module.css'

export interface AiChatInputAction {
  label: string
  onSelect?: () => void
}

export interface AiChatInputStatus {
  state: ChatState
  onRetry: () => void
  onRestart: () => void
}

export interface AiChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (text: string) => void
  disabled?: boolean
  placeholder?: string
  actions?: AiChatInputAction[]
  status?: AiChatInputStatus
}

export function AiChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder,
  actions,
  status,
}: AiChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const sentMessagesRef = useRef<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const editedHistoryRef = useRef<string | null>(null)
  const pendingCaretRef = useRef<number | null>(null)

  const canSend = !disabled && value.trim().length > 0

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${String(el.scrollHeight)}px`
    const caret = pendingCaretRef.current
    if (caret !== null) {
      pendingCaretRef.current = null
      el.setSelectionRange(caret, caret)
    }
  }, [value, textareaRef])

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    sentMessagesRef.current = [...sentMessagesRef.current, trimmed]
    setHistoryIndex(-1)
    editedHistoryRef.current = null
    onSubmit(text)
  }

  function handleFormSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    submit(value)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value)
    if (historyIndex >= 0) {
      setHistoryIndex(-1)
      editedHistoryRef.current = null
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        e.preventDefault()
        const el = e.currentTarget
        const start = el.selectionStart
        const end = el.selectionEnd
        pendingCaretRef.current = start + 1
        onChange(`${value.slice(0, start)}\n${value.slice(end)}`)
        return
      }
      e.preventDefault()
      submit(value)
      return
    }

    const el = textareaRef.current
    if (e.key === 'ArrowUp') {
      if (el?.selectionStart !== 0 || el.selectionEnd !== 0) return
      e.preventDefault()
      const history = sentMessagesRef.current
      if (history.length === 0) return
      if (historyIndex === -1) {
        editedHistoryRef.current = value
      }
      const nextIndex = Math.min(historyIndex + 1, history.length - 1)
      setHistoryIndex(nextIndex)
      onChange(history[history.length - 1 - nextIndex])
    }
    else if (e.key === 'ArrowDown') {
      if (el?.selectionStart !== value.length || el.selectionEnd !== value.length) return
      e.preventDefault()
      if (historyIndex === -1) return
      if (historyIndex === 0) {
        setHistoryIndex(-1)
        onChange(editedHistoryRef.current ?? '')
        editedHistoryRef.current = null
      }
      else {
        const nextIndex = historyIndex - 1
        setHistoryIndex(nextIndex)
        onChange(sentMessagesRef.current[sentMessagesRef.current.length - 1 - nextIndex])
      }
    }
  }

  function selectAction(action: AiChatInputAction) {
    if (action.onSelect) {
      action.onSelect()
    }
    else {
      submit(action.label)
    }
  }

  const chips = actions && actions.length > 0
    ? (
        <div className={styles.chips}>
          {actions.map((action, index) => (
            <button
              key={`action_${String(index)}`}
              type="button"
              className={styles.chip}
              disabled={disabled}
              onClick={() => { selectAction(action) }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )
    : null

  return (
    <div className={styles.container}>
      {status && (
        <AiConnectionStatusIndicator
          state={status.state}
          onRetry={status.onRetry}
          onRestart={status.onRestart}
        />
      )}
      {chips}
      <form onSubmit={handleFormSubmit} className={styles.inputRow}>
        <textarea
          ref={textareaRef}
          rows={1}
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={styles.input}
          aria-label={placeholder}
        />
        <button type="submit" disabled={!canSend} className={styles.sendButton} aria-label="Send" title="Send">
          <Icon name="send" className={styles.sendIcon} style={{ width: 13, height: 13 }} />
        </button>
      </form>
    </div>
  )
}
