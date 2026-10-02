'use client'

import { useEffect, useRef, useState } from 'react'
import { AiConnectionStatusIndicator } from './AiConnectionStatusIndicator'
import { AiActionList } from './AiActionList'
import { Icon } from '../Icon'
import { ChatState } from './AiChatState'
import styles from './AiChatInput.module.css'

export interface AiChatInputAction {
  label: string
  onSelect?: () => void
}

export interface AiChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (text: string) => void
  disabled?: boolean
  placeholder?: string
  actions?: AiChatInputAction[]
  status?: ChatState
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
      scrollCaretIntoView(el)
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
      // Entering history mode requires the caret at the start; once navigating the history,
      // further presses keep navigating so scrolling through entries needs no extra presses.
      if (historyIndex === -1 && (el?.selectionStart !== 0 || el.selectionEnd !== 0)) return
      e.preventDefault()
      const history = sentMessagesRef.current
      if (history.length === 0) return
      if (historyIndex === -1) {
        editedHistoryRef.current = value
      }
      const nextIndex = Math.min(historyIndex + 1, history.length - 1)
      setHistoryIndex(nextIndex)
      pendingCaretRef.current = 0
      onChange(history[history.length - 1 - nextIndex])
    }
    else if (e.key === 'ArrowDown') {
      if (historyIndex === -1 && (el?.selectionStart !== value.length || el.selectionEnd !== value.length)) return
      e.preventDefault()
      if (historyIndex === -1) return
      if (historyIndex === 0) {
        setHistoryIndex(-1)
        pendingCaretRef.current = 0
        onChange(editedHistoryRef.current ?? '')
        editedHistoryRef.current = null
      }
      else {
        const nextIndex = historyIndex - 1
        setHistoryIndex(nextIndex)
        const recalled = sentMessagesRef.current[sentMessagesRef.current.length - 1 - nextIndex]
        pendingCaretRef.current = recalled.length
        onChange(recalled)
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

  return (
    <div className={styles.container}>
      {status && <AiConnectionStatusIndicator state={status} />}
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
      {actions && actions.length > 0 && (
        <AiActionList
          actions={actions.map(action => ({ label: action.label, onSelect: () => { selectAction(action) } }))}
          disabled={disabled}
        />
      )}
    </div>
  )
}

function scrollCaretIntoView(el: HTMLTextAreaElement): void {
  if (el.scrollHeight <= el.clientHeight) return
  const caret = el.selectionStart
  const style = getComputedStyle(el)
  const mirror = document.createElement('div')
  mirror.textContent = el.value.slice(0, caret) || ' '
  mirror.style.cssText = [
    'position: absolute',
    'visibility: hidden',
    'white-space: pre-wrap',
    'word-wrap: break-word',
    'overflow: hidden',
    `width: ${String(el.clientWidth)}px`,
    `font: ${style.font}`,
    `line-height: ${style.lineHeight}`,
    `letter-spacing: ${style.letterSpacing}`,
    `padding: ${style.padding}`,
    `border: ${style.border}`,
    'box-sizing: border-box',
  ].join(';')
  document.body.appendChild(mirror)
  const paddingBottom = parseFloat(style.paddingBottom) || 0
  const lineHeight = parseFloat(style.lineHeight) || 16
  const caretBottom = mirror.clientHeight - paddingBottom
  document.body.removeChild(mirror)
  const maxScroll = el.scrollHeight - el.clientHeight
  const target = caretBottom - el.clientHeight + lineHeight
  el.scrollTop = Math.min(maxScroll, Math.max(0, target))
}
