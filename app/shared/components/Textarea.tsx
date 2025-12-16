'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import style from './Textarea.module.css'

export interface Selection {
  start: number
  end: number
  text: string
}

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'placeholder' | 'children'> {
  label?: string
  value?: string
  keepSelection?: boolean
  ref?: React.RefObject<HTMLTextAreaElement>
  onSelectionChange?: (selection?: Selection) => void
}

/** A textarea component with the following additional features
 * It tracks selected text and notifies the parent component via onSelectionChange. It can track selection even when the textarea is not focused (if keepSelection is true).
 * It informs the parent component of changes via onChange only when the textarea loses focus (onBlur).
 * It displays a floating label when a label prop is provided.
 */
export default function Textarea({ label, keepSelection, onSelectionChange, className, style: inputStyle, ...props }: TextareaProps) {
  const [selection, setSelection] = useState<Selection | undefined>(undefined)
  const [focused, setFocused] = useState<boolean>(false)
  const [scrollTop, setScrollTop] = useState<number>(0)
  const [width, setWidth] = useState<number>(0)
  const [height, setHeight] = useState<number>(0)
  const [internalValue, setInternalValue] = useState('')
  const inputIfNotDefined = useRef<HTMLTextAreaElement | null>(null)
  const input = props.ref ?? inputIfNotDefined
  const fallbackId = useId()
  const div = useRef<HTMLDivElement | null>(null)
  const textareaClasses = [style.textarea, label ? '' : style.noLabel].join(' ')
  const containerClasses = [style.container, className ?? ''].join(' ')
  const holderClasses = [style.holder, label ? '' : style.noLabel].join(' ')
  const value = props.value ?? internalValue
  const id = props.id ?? fallbackId

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInternalValue(e.target.value)
    updateSelection(e)
    props.onChange?.(e)
  }

  function handleBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    setFocused(false)
    if (keepSelection) updateSelection(e)
    else {
      setSelection(undefined)
      onSelectionChange?.(undefined)
    }
    props.onBlur?.(e)
  }

  function handleFocus(e: React.FocusEvent<HTMLTextAreaElement>) {
    setFocused(true)
    updateSelection(e)
    props.onFocus?.(e)
  }

  function handleMouseUp(e: React.MouseEvent<HTMLTextAreaElement>) {
    setTimeout(() => { updateSelection(e) }, 10)
    props.onMouseUp?.(e)
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLTextAreaElement>) {
    setTimeout(() => { updateSelection(e) }, 10)
    props.onMouseLeave?.(e)
  }

  function handleKeyUp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    setTimeout(() => { updateSelection(e) }, 10)
    props.onKeyUp?.(e)
  }

  function updateSelection(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    const target = e.target as HTMLTextAreaElement
    const start = target.selectionStart
    const end = target.selectionEnd
    const text = target.value.substring(start, end)
    const newSelection = start === end ? undefined : { start, end, text }
    if (newSelection?.start === selection?.start && newSelection?.end === selection?.end) {
      return
    }
    setSelection(newSelection)
    onSelectionChange?.(newSelection)
  }

  function handleScroll(e: React.UIEvent<HTMLTextAreaElement>): void {
    if (!input.current) return
    setScrollTop(input.current.scrollTop)
    props.onScroll?.(e)
  }

  const updateSize = useCallback((current: HTMLTextAreaElement | null) => {
    if (!current) return
    setWidth(current.clientWidth)
    setHeight(current.clientHeight)
  }, [])

  useEffect(() => {
    if (!input.current) return
    const observer = new ResizeObserver(() => { updateSize(input.current) })
    observer.observe(input.current)
    setTimeout(() => { updateSize(input.current) }, 100)
    return () => { observer.disconnect() }
  }, [input, updateSize])

  useEffect(() => {
    if (!selection) return
    if (value.substring(selection.start, selection.end) !== selection.text)
      setTimeout(() => { setSelection(undefined) }, 100)
  }, [value, selection])

  return (
    <div className={containerClasses} style={inputStyle}>
      <textarea
        {...props}
        id={id}
        className={textareaClasses}
        value={value}
        ref={input}
        placeholder=""
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onKeyUp={handleKeyUp}
        onScroll={handleScroll}
      >
      </textarea>
      { label && <label className={style.label} htmlFor={id}>{label}</label>}
      { selection && !focused && keepSelection && (
        <div className={holderClasses} ref={div} style={{ top: (-scrollTop).toString() + 'px', width: width.toString() + 'px', height: height.toString() + 'px' }}>
          {value.substring(0, selection.start)}
          <span>{selection.text}</span>
          {value.substring(selection.end)}
        </div>
      )}
    </div>
  )
}
