import { createContext } from 'react'

export type MessageType = 'danger' | 'info' | 'success'

export type InfoHandler = (type: MessageType, message: string, timeToShow?: number) => void

export const InfoContext = createContext<InfoHandler>(() => { /* empty */ })
InfoContext.displayName = 'InfoContext'
