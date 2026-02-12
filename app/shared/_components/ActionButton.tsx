'use client'
import { useEffect, useState } from 'react'
import { Button, ButtonProps } from './form/Button'
import { createPortal } from 'react-dom'
import style from './ActionTitle.module.css'

export function ActionButton({ children, ...props }: ButtonProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true)
  }, [])

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
