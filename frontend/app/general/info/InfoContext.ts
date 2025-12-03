import { createContext } from 'react'

export type MessageType = 'danger' | 'info' | 'success'

export interface Link {
  text: string
  url: string
}

export type InfoHandler = (type: MessageType, message: string, link: Link | undefined, timeToShow: number) => void

export const InfoContext = createContext<InfoHandler>(() => { /* empty */ })
InfoContext.displayName = 'InfoContext'
