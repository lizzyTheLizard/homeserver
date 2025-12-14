import { useState } from 'react'
import style from './Input.module.css'
import { v4 as randomUUID } from 'uuid'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder' | 'children'> {
  label?: string
  value?: string
  ref?: React.RefObject<HTMLInputElement>
}

/** An input component styled
 */
export default function Input({ label, ...props }: InputProps) {
  const [internalValue, setInternalValue] = useState('')
  const id = props.id ?? randomUUID()
  const inputClasses = [style.input, props.className ?? '', label ? '' : style.noLabel].join(' ')
  const value = props.value ?? internalValue

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInternalValue(e.target.value)
    props.onChange?.(e)
  }

  return (
    <div className={style.container} style={props.style}>
      <input
        {...props}
        id={id}
        className={inputClasses}
        value={value}
        placeholder=""
        onChange={handleChange}
      />
      { label && <label className={style.label} htmlFor={id}>{label}</label>}
    </div>
  )
}
