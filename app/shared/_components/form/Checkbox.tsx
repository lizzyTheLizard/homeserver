'use client'
import { useId, useState } from 'react'
import style from './Checkbox.module.css'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'placeholder' | 'children' | 'required' | 'value'> {
  label?: string
  small?: boolean
  center?: boolean
  ref?: React.RefObject<HTMLInputElement>
}

/** An input component styled
 */
export function Checkbox({ label, small, center, ...props }: CheckboxProps) {
  const [internalValue, setInternalValue] = useState(false)
  const fallbackId = useId()
  const id = props.id ?? fallbackId
  const inputClasses = [
    style.input, props.className ?? '',
    label ? '' : style.noLabel,
    small ? style.small : '',
  ].join(' ')
  const containerClasses = [
    style.container,
    center ? style.center : '',
  ].join(' ')
  const value = props.checked ?? internalValue

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInternalValue(e.target.checked)
    props.onChange?.(e)
  }

  return (
    <div className={containerClasses}>
      <input
        {...props}
        id={id}
        type="checkbox"
        className={inputClasses}
        checked={value}
        placeholder=""
        onChange={handleChange}
      />
      { label && <label className={style.label} htmlFor={id}>{label}</label>}
    </div>
  )
}
