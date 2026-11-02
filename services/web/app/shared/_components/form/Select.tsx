import { useId } from 'react'
import style from './Select.module.css'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  emptyLabel?: string
  value?: string
  small?: boolean
  ref?: React.Ref<HTMLSelectElement>
}

/**
 * A select component allowing users to choose from a list of options.
 */
export function Select({ label, emptyLabel, small, children, ...props }: SelectProps) {
  const fallbackId = useId()
  const id = props.id ?? fallbackId
  const inputClasses = [
    style.input, props.className ?? '',
    label ? '' : style.noLabel,
    small ? style.small : '',
  ].join(' ')

  return (
    <div className={style.container} style={props.style}>
      <select id={id} {...props} className={inputClasses}>
        <option value="" style={{ display: props.required ? 'none' : undefined }}>{emptyLabel ?? 'No value selected'}</option>
        {children}
      </select>
      {label && <label className={style.label} htmlFor={id}>{label}</label>}
    </div>
  )
}
