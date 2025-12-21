import style from './Button.module.css'

export interface ButtonProps {
  ref?: React.RefObject<HTMLButtonElement>
  disabled?: boolean | undefined
  type?: 'submit' | 'reset' | 'button' | undefined
  variant?: 'primary' | 'secondary' | 'danger' | 'link'
  className?: string
  style?: React.CSSProperties
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children?: React.ReactNode
}

/** An simple button
 */
export default function Button({ variant, children, ...props }: ButtonProps) {
  const buttonClasses = [style.button, props.className ?? '', style[variant ?? 'primary']].join(' ')

  return (
    <button {...props} className={buttonClasses}>
      {children}
    </button>
  )
}
