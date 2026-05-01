'use client'
import { Button, ButtonProps } from './form/Button'
import { createPortal } from 'react-dom'
import style from './ActionTitle.module.css'
import { useIsClient } from '../_helper/useIsClient'

export function ActionButton({ children, ...props }: ButtonProps) {
  const isClient = useIsClient()

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    props.onClick?.(e)
  }

  const content = (
    <Button {...props} onClick={onClick}>
      {children}
    </Button>
  )

  if (!isClient) return null
  if (typeof document === 'undefined')
    return content
  const actionTitleContainer = document.getElementsByClassName(style.title)
  if (actionTitleContainer.length === 0)
    return content
  return createPortal(content, actionTitleContainer[0])
}
