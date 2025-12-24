import { useId, useState } from 'react'
import style from './Input.module.css'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder' | 'children'> {
  label?: string
  value?: string
  ref?: React.RefObject<HTMLInputElement>
}

/** An input component styled
 */
export function Input({ label, ...props }: InputProps) {
  const [internalValue, setInternalValue] = useState('')
  const fallbackId = useId()
  const id = props.id ?? fallbackId
  const inputClasses = [style.input, props.className ?? '', label ? '' : style.noLabel].join(' ')
  const value = props.value ?? internalValue

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInternalValue(e.target.value)
    props.onChange?.(e)
  }

  return (
    <div className={style.container}>
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
