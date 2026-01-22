import { useState } from 'react'
import { ActionResponse } from '../../_helper/ActionResponse'

export interface SidebarState {
  open?: boolean
  pending?: boolean
  error?: string
  title?: string
  type?: string
}

export interface SidebarStateModifier {
  openSidebar: (title: string) => void
  closeSidebar: () => void
  execute: <T>(response: ActionResponse<T>, onSuccess: (result: T) => void) => void
}

export function useSidebarState(type: string | undefined): [SidebarState, SidebarStateModifier] {
  const [error, setError] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)
  const [title, setTitle] = useState<string | undefined>(undefined)

  function openSidebar(newTitle: string) {
    setOpen(true)
    setError(undefined)
    setTitle(newTitle)
  }

  function closeSidebar() {
    setOpen(false)
  }

  function execute<T>(response: ActionResponse<T>, onSuccess: (result: T) => void) {
    setPending(true)
    setError(undefined)
    response.then((result) => {
      setPending(false)
      if ('error' in result) {
        setError(result.error)
        return
      }
      onSuccess(result.data)
      setOpen(false)
    }).catch((error: unknown) => {
      console.error(error)
      setPending(false)
      setError('An unexpected error occurred.')
    })
  }

  const sidebarState = { open, pending, error, title, type }
  const sidebarStateModifier = { openSidebar, closeSidebar, execute }
  return [sidebarState, sidebarStateModifier]
}
