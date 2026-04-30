'use client'
import { Button, ButtonProps } from './form/Button'
import { createPortal } from 'react-dom'
import style from './ActionTitle.module.css'
import { useIsClient } from '../_helper/useIsClient'

export function ActionButton({ children, ...props }: ButtonProps) {
  const isClient = useIsClient()

  const content = (
    <Button {...props}>
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
