import { useEffect, useRef, useState } from 'react'
import style from './GsTextarea2.module.css'
import { v4 as randomUUID } from 'uuid'

export interface Selection {
  start: number
  end: number
  text: string
}

export interface GsTextarea2Props {
  name?: string
  id?: string
  disabled?: boolean
  label?: string
  value?: string
  keepSelection?: boolean
  className?: string
  required?: boolean
  onChange?: (e: string) => void
  onSelectionChange?: (selection?: Selection) => void
}

/** A textarea component with the following additional features
 * It tracks selected text and notifies the parent component via onSelectionChange. It can track selection even when the textarea is not focused (if keepSelection is true).
 * It informs the parent component of changes via onChange only when the textarea loses focus (onBlur).
 * It displays a floating label when a label prop is provided.
 */
export default function GsTextarea2(props: GsTextarea2Props) {
  const [value, setValue] = useState<string>(props.value ?? '')
  const [changed, setChanged] = useState(false)
  const [selection, setSelection] = useState<Selection | undefined>(undefined)
  const [focused, setFocused] = useState<boolean>(false)
  const [scrollTop, setScrollTop] = useState<number>(0)
  const [width, setWidth] = useState<number>(0)
  const [height, setHeight] = useState<number>(0)
  const input = useRef<HTMLTextAreaElement | null>(null)
  const div = useRef<HTMLDivElement | null>(null)

  const id = props.id ?? 'gs-textarea-' + randomUUID()
  const textareaClasses = [style.textarea, props.disabled ? style.disabled : ''].join(' ')
  const containerClasses = [style.container, props.className ?? ''].join(' ')
  const actualValue = changed ? value : (props.value ?? '')

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setChanged(true)
    setValue(e.target.value)
    updateSelection(e)
  }

  function handleBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    if (props.value !== actualValue) props.onChange?.(actualValue)
    setChanged(false)
    setFocused(false)
    if (props.keepSelection) updateSelection(e)
    else {
      setSelection(undefined)
      props.onSelectionChange?.(undefined)
    }
  }

  function handleFocus(e: React.FocusEvent<HTMLTextAreaElement>) {
    setFocused(true)
    updateSelection(e)
  }

  function handleMouse(e: React.MouseEvent<HTMLTextAreaElement>) {
    setTimeout(() => { updateSelection(e) }, 10)
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
    props.onSelectionChange?.(newSelection)
  }

  function handleScroll(): void {
    if (!input.current) return
    setScrollTop(input.current.scrollTop)
  }

  function updateSize() {
    console.log('Update size')
    if (!input.current) return
    setWidth(input.current.clientWidth)
    setHeight(input.current.clientHeight)
  }

  useEffect(() => {
    console.log('Setting up resize observer for textarea')
    const observer = new ResizeObserver(() => { updateSize() })
    if (input.current) {
      observer.observe(input.current)
      updateSize()
    }
  }, [])

  if (selection && actualValue.substring(selection.start, selection.end) !== selection.text) {
    setSelection(undefined)
  }

  return (
    <div className={containerClasses}>
      <textarea
        id={id}
        name={props.name}
        placeholder=" "
        className={textareaClasses}
        disabled={props.disabled}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onMouseUp={handleMouse}
        onMouseLeave={handleMouse}
        onScroll={handleScroll}
        value={actualValue}
        required={props.required}
        ref={input}
      >
      </textarea>
      { props.label && <label className={style.label} htmlFor={id}>{props.label}</label>}
      { selection && !focused && props.keepSelection && (
        <div className={style.holder} ref={div} style={{ top: (-scrollTop).toString() + 'px', width: width.toString() + 'px', height: height.toString() + 'px' }}>
          {actualValue.substring(0, selection.start)}
          <span>{selection.text}</span>
          {actualValue.substring(selection.end)}
        </div>
      )}
    </div>
  )
}
