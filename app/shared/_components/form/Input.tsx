'use client'
import { useId, useState } from 'react'
import style from './Input.module.css'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder' | 'children'> {
  label?: string
  value?: string
  small?: boolean
  ref?: React.RefObject<HTMLInputElement>
}

/** An input component styled
 */
export function Input({ label, small, ...props }: InputProps) {
  const [internalValue, setInternalValue] = useState('')
  const [focus, setFocus] = useState(false)
  const fallbackId = useId()
  const id = props.id ?? fallbackId
  const preFormatedValue = props.value ?? internalValue
  const value = props.type === 'date' && !focus && preFormatedValue
    ? new Date(preFormatedValue).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
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
      />
      { label && <label className={style.label} htmlFor={id}>{label}</label>}
    </div>
  )
}
