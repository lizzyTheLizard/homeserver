'use client'
import { createPortal } from 'react-dom'
import { ReactNode } from 'react'
import { useIsClient } from '../_helper/useIsClient'
import actionTitleStyle from './ActionTitle.module.css'

export function useActionTitle(): (content: ReactNode) => ReactNode {
  const isClient = useIsClient()

  return (content: ReactNode) => {
    if (!isClient) return null
    if (typeof document === 'undefined') return content
    const container = document.getElementsByClassName(actionTitleStyle.title)
    if (container.length === 0) return content
    return createPortal(content, container[0])
  }
}
