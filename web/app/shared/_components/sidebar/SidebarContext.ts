import { v4 as randomUUID } from 'uuid'
import { createContext, useContext, useState } from 'react'

export interface SidebarContextValue {
  open: (id: string) => void
  close: () => void
  isOpen: (id: string) => boolean
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar(): [string, () => void] {
  const [sidebarId] = useState(randomUUID())
  const sidebarContext = useContext(SidebarContext)
  if (!sidebarContext) throw new Error('useSidebar must be used within a SidebarProvider')
  const openSidebar = () => { sidebarContext.open(sidebarId) }
  return [sidebarId, openSidebar]
}
