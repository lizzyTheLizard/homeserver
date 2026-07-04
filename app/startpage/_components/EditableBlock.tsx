'use client'

import { useState, useRef } from 'react'
import { Textarea, type Selection } from '@/app/shared/_components/form/Textarea'
import styles from './EditableBlock.module.css'

type EditState = 'viewing' | 'editing' | 'revised'

export function EditableBlock({ content, onEdit }: { content: string, onEdit?: (value: string, selection?: Selection) => void }) {
  const [state, setState] = useState<EditState>('viewing')
  const [editValue, setEditValue] = useState(content)
  const [revised, setRevised] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection | undefined>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleEdit() {
    setEditValue(content)
    setState('editing')
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.select()
      }
    }, 50)
  }

  function handleCancel() {
    setState('viewing')
  }

  function handleOk() {
    if (editValue !== content) {
      setRevised(editValue)
      setState('revised')
      if (onEdit) onEdit(editValue, selection)
    }
    else {
      setState('viewing')
    }
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

  if (state === 'revised' && revised !== null) {
    return (
      <div className={styles.editableRevised}>
        <div className={styles.editableRevisedLabel}>Edited</div>
        <div className={styles.editableRevisedContent}>{revised}</div>
        <div className={styles.editableRevisedOriginal}>
          <span className={styles.editableRevisedStrike}>{content}</span>
        </div>
      </div>
    )
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
            onSelectionChange={setSelection}
            className={styles.editableTextarea}
          />
          <div className={styles.editableEditingToolbar}>
            <button onClick={handleCancel} className={styles.editableCancelBtn}>
              Cancel
            </button>
            <button onClick={handleOk} className={styles.editableOkBtn}>
              OK
            </button>
          </div>
        </div>
        <div className={styles.editableHint}>&#x2318;&#x23CE; to confirm &middot; Esc to cancel</div>
      </div>
    )
  }

  return (
    <div onClick={handleEdit} className={styles.editableView}>
      <div className={styles.editableViewLabel}>Editable &middot; click to edit</div>
      <div className={styles.editableViewContent}>{content}</div>
    </div>
  )
}
