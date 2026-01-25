import { HTMLAttributes, PropsWithChildren } from 'react'
import style from './ActionTitle.module.css'

export function ActionTitle({ children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div {...props} className={style.title + ' ' + (props.className ? ` ${props.className}` : '')}>
      {children}
    </div>
  )
}
