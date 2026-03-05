'use client'
import { useId, useState } from 'react'
import style from './Input.module.css'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder' | 'children' | 'list'> {
  label?: string
  value?: string
  small?: boolean
  ref?: React.RefObject<HTMLInputElement>
  list?: string[]
}

/** An input component styled
 */
export function Input({ list, label, small, ...props }: InputProps) {
  const [internalValue, setInternalValue] = useState('')
  const [focus, setFocus] = useState(false)
  const fallbackId = useId()
  const id = props.id ?? fallbackId
  const listId = list ? `${id}-list` : undefined
  const value = getValue(props.value, internalValue, props.type, focus)
  const inputClasses = [
    style.input, props.className ?? '',
    label ? '' : style.noLabel,
    small ? style.small : '',
  ].join(' ')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInternalValue(e.target.value)
    props.onChange?.(e)
  }

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    setFocus(true)
    props.onFocus?.(e)
  }

  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    setFocus(false)
    props.onBlur?.(e)
  }

  return (
    <div className={style.container}>
      <input
        {...props}
        id={id}
        className={inputClasses}
        value={value}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder=""
        onChange={handleChange}
        list={listId}
      />
      { label && <label className={style.label} htmlFor={id}>{label}</label>}
      {list && (
        <datalist id={listId}>
          {list.map((item, index) => (
            <option key={index} value={item} />
          ))}
        </datalist>
      )}
    </div>
  )
}

function getValue(propValue: string | number | undefined, internalValue: string, type: string | undefined, focus: boolean): string | number {
  const preFormatedValue = propValue ?? internalValue
  // While editing, show unformatted value
  if (focus) return preFormatedValue
  // For currency, show value incl. currency symbol
  if (type === 'currency')
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'CHF' }).format(Number(preFormatedValue))
  return preFormatedValue
}
