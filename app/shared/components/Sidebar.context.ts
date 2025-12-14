import { createContext, ReactNode } from 'react'

export interface SidebarContent {
  title: string
  type?: string
  content: ReactNode
}

export interface SidebarController {
  open: (content: SidebarContent) => void
  close: () => void
  isOpen: () => boolean
}

export const SidebarContext = createContext<SidebarController | null>(null)
SidebarContext.displayName = 'SidebarContext'
