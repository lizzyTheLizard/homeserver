'use client'

import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/app/shared/_components/form/Textarea'
import styles from './EditableBlock.module.css'

type EditState = 'viewing' | 'editing'

export function EditableBlock({ content, onEdit, editable, response }: { content: string, onEdit?: (editedText: string) => void, editable?: boolean, response: boolean }) {
  const [state, setState] = useState<EditState>('viewing')
  const [editValue, setEditValue] = useState(content)
  const [dimensions, setDimensions] = useState<{ width: number, height: number } | null>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    console.log('EditableBlock content changed, updating editValue')
  }, [])

  function handleEdit() {
    if (viewRef.current) {
      const rect = viewRef.current.getBoundingClientRect()
      setDimensions({ width: rect.width, height: rect.height })
    }
    setEditValue(content)
    setState('editing')
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 50)
  }

  function handleCancel() {
    setState('viewing')
  }

  function handleOk() {
    if (editValue !== content) {
      if (onEdit) onEdit(editValue)
    }
    setState('viewing')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleOk()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  if (state === 'editing') {
    return (
      <div className={styles.editableEditing}>
        <div className={styles.editableEditingBorder}>
          <Textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => { setEditValue(e.target.value) }}
            onKeyDown={handleKeyDown}
            style={dimensions ? { width: dimensions.width, height: dimensions.height } : undefined}
            className={styles.editableTextarea}
          />
          <div className={styles.editableEditingToolbar}>
            <button onClick={handleCancel} className={styles.editableCancelBtn}>
              Cancel
            </button>
            <button onClick={handleOk} className={styles.editableOkBtn} disabled={editValue === content}>
              OK
            </button>
          </div>
        </div>
        <div className={styles.editableHint}>&#x2318;&#x23CE; to confirm &middot; Esc to cancel</div>
      </div>
    )
  }

  if (response) {
    return (
      <div ref={viewRef} className={`${styles.editableView} ${styles.editableViewResponse}`}>
        <div className={styles.editableViewContent}>{content}</div>
      </div>
    )
  }

  if (!editable) {
    return (
      <div ref={viewRef} className={`${styles.editableView} ${styles.editableViewDisabled}`}>
        <div className={styles.editableViewContent}>{content}</div>
      </div>
    )
  }

  return (
    <div ref={viewRef} onClick={handleEdit} className={styles.editableView}>
      <div className={styles.editableViewLabel}>Editable &middot; click to edit</div>
      <div className={styles.editableViewContent}>{content}</div>
    </div>
  )
}
