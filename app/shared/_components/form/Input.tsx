'use client'
import { useId, useState } from 'react'
import style from './Input.module.css'
import { Temporal } from '@js-temporal/polyfill'

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
  const preFormatedValue = props.value ?? internalValue
  const value = props.type === 'date' && !focus && preFormatedValue
    ? Temporal.PlainDate.from(preFormatedValue).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
    : preFormatedValue
  const type = props.type === 'date' && !focus ? 'text' : props.type
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
        type={type}
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
