'use client'
import { createPortal } from 'react-dom'
import type { ReactNode} from 'react';
import { useSyncExternalStore } from 'react'
import actionTitleStyle from './ActionTitle.module.css'

const unsubscribe = () => undefined,
 subscribe = () => unsubscribe

export function useActionTitle(): (content: ReactNode) => ReactNode {
  const container = useSyncExternalStore(
    subscribe,
    () => {
      const els = document.getElementsByClassName(actionTitleStyle.title)
      return els.length > 0 ? els[0] : undefined
    },
    () => undefined,
  )

  return (content: ReactNode) => {
    if (!container) {return content}
    return createPortal(content, container)
  }
}
