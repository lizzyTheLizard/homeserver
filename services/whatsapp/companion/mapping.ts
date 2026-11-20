export interface Chat {
  id: string
  name: string
  isArchived: boolean
  isGroup: boolean
  lastMessageTimestamp: string
}

export interface Message {
  id: string
  chatId?: string
  fromMe: boolean
  fromName: string
  content: string
  messageTimestamp: string
}

export function mapChats(data: unknown): Chat[] {
  if (!Array.isArray(data)) {return []}
  const chats = data as WacliChat[]
  return chats
    .filter(chat => chat.jid !== 'status@broadcast')
    .map(mapChat)
    .sort((a, b) => {
      const ta = Date.parse(a.lastMessageTimestamp) || 0,
       tb = Date.parse(b.lastMessageTimestamp) || 0
      return tb - ta
    })
}

function mapChat(chat: WacliChat): Chat {
  const id = typeof chat.jid === 'string' ? chat.jid : '',
   name = typeof chat.name === 'string' && chat.name.trim() ? chat.name.trim() : id
  return {
    id,
    isArchived: chat.archived === true,
    isGroup: id.endsWith('@g.us'),
    lastMessageTimestamp: normalizeTimestamp(chat.last_message_ts),
    name,
  }
}

interface WacliChat {
  jid?: string
  kind?: string
  name?: string
  last_message_ts?: string
  archived?: boolean
}

export function mapAuthenticated(data: unknown): boolean {
  const obj = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
  return obj.authenticated === true
}

export function mapChatArchived(data: unknown): boolean {
  const chat = (typeof data === 'object' && data !== null ? data : {}) as WacliChat
  return chat.archived === true
}

export function mapMessages(data: unknown): Message[] {
  const result = data as { messages?: WacliMessage[] } | undefined
  if (!Array.isArray(result?.messages)) {return []}
  return result.messages.map(mapMessage).filter(m => m.content.length > 0)
}

function mapMessage(message: WacliMessage): Message {
  const id = typeof message.MsgID === 'string' ? message.MsgID : '',
   fromMe = message.FromMe === true || message.FromMe === 1,
   senderJid = typeof message.SenderJID === 'string' ? message.SenderJID : '',
   senderName = typeof message.SenderName === 'string' ? message.SenderName : '',
   content = typeof message.Text === 'string' ? message.Text : ''
  return {
    chatId: message.ChatJID,
    content,
    fromMe,
    fromName: formatSenderName(senderJid, fromMe, senderName),
    id,
    messageTimestamp: normalizeTimestamp(message.Timestamp),
  }
}

function formatSenderName(senderJid: string, fromMe: boolean, senderName: string): string {
  if (fromMe) {return 'Me'}
  const name = senderName.trim()
  if (name) {return name}
  if (senderJid.endsWith('@s.whatsapp.net')) {return senderJid.slice(0, -'@s.whatsapp.net'.length)}
  return senderJid
}

function normalizeTimestamp(value: unknown): string {
  const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
  if (typeof value !== 'string' || value === '') {return ''}
  if (UTC_TIMESTAMP.test(value)) {
    // Strip any fractional seconds.
    return value.replace(/\.\d+Z$/, 'Z')
  }
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().replace(/\.\d{3}Z$/, 'Z')
  }
  return value
}

interface WacliMessage {
  MsgID?: string
  FromMe?: boolean | number
  SenderJID?: string
  ChatJID?: string
  SenderName?: string
  Text?: string
  Timestamp?: string
}
