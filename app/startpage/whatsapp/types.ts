export type SyncStatus = { type: 'connecting' } | { type: 'needAuth', qr: string } | { type: 'connected' } | { type: 'fullsync' } | { type: 'closed', error?: string }

export interface Message {
  id: string
  fromMe: boolean
  fromName: string
  content: string
  messageTimestamp: string
}

export interface Chat {
  id: string
  name: string
  isArchived: boolean
  isGroup: boolean
  lastMessageTimestamp: string
}
