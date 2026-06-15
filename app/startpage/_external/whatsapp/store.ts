import { BaileysEventMap, Chat, ChatUpdate, Contact, LIDMapping, proto, toNumber, WAMessage, WAMessageKey, WAMessageUpdate } from '@whiskeysockets/baileys'
import { transactional } from '@/app/shared/_external/db/access'
import { ChatInput, cleanWhatsAppDataOfOwner, ContactInput, deleteChatsById, deleteMessages, MessageInput, updateChats, updateContacts, updateLidMapping, updateMessages } from '../../_data/Chat'
import { logger } from '@/app/shared/logger'

export interface Processor { process: (handler: (events: Partial<BaileysEventMap>) => Promise<void>) => void }

export interface WhatsAppStore {
  reset: () => Promise<void>
}

export function createStore(owner: string, ev: Processor): WhatsAppStore {
  async function setHistory(event: { chats: Chat[], contacts: Contact[], messages: WAMessage[], lidPnMappings?: LIDMapping[] }) {
    const chatInput = event.chats.filter(filterIrrelevantChats).map(toChat)
    const contactInput = event.contacts.filter(filterIrrelevantContacts).map(toContact)
    const messageInput = event.messages.filter(u => filterIrrelevantMessages(u.key, u)).map(u => toMessage(u.key, u))
    const lidMappingInput = event.lidPnMappings ?? []
    await transactional(async (client) => {
      await updateContacts(client, owner, contactInput)
      await updateChats(client, owner, chatInput)
      await updateMessages(client, owner, messageInput)
      await updateLidMapping(client, owner, lidMappingInput)
    })
  }

  async function chatsDelete(event: string[]) {
    await transactional(async (client) => {
      await deleteChatsById(client, owner, event)
    })
  }

  async function chatsUpdate(event: ChatUpdate[]) {
    const inputs = event.filter(filterIrrelevantChats).map(toChat)
    await transactional(async (client) => {
      await updateChats(client, owner, inputs)
    })
  }

  async function contactsUpdate(event: Partial<Contact>[]) {
    const inputs = event.filter(filterIrrelevantContacts).map(toContact)
    await transactional(async (client) => {
      await updateContacts(client, owner, inputs)
    })
  }

  async function messageDelete(event: { keys: WAMessageKey[] } | { jid: string, all: true }) {
    const ids = 'jid' in event ? [event.jid] : event.keys.map(k => k.id ?? '').filter(id => !!id)
    await transactional(async (client) => {
      await deleteMessages(client, owner, ids)
    })
  }

  async function messageUpdate(event: WAMessageUpdate[]) {
    const inputs = event.filter(u => filterIrrelevantMessages(u.key, u.update)).map(u => toMessage(u.key, u.update))
    await transactional(async (client) => {
      await updateMessages(client, owner, inputs)
    })
  }

  async function messagesUpsert(event: { messages: WAMessage[] }) {
    const inputs = event.messages.filter(u => filterIrrelevantMessages(u.key, u)).map(u => toMessage(u.key, u))
    await transactional(async (client) => {
      await updateMessages(client, owner, inputs)
    })
  }

  async function lidMappingUpdate(mapping: LIDMapping[]) {
    await transactional(async (client) => {
      await updateLidMapping(client, owner, mapping)
    })
  }

  ev.process(async (e) => {
    // Enable to debug
    // const stringified = JSON.stringify(e)
    // logger.debug(`Received WhatsApp event: ${stringified.length > 5000 ? stringified.substring(0, 5000) + '...' : stringified}`)

    for (const key of Object.keys(e) as (keyof BaileysEventMap)[]) {
      switch (key) {
        case 'messaging-history.set':
          await setHistory(e[key] ?? { chats: [], contacts: [], messages: [] })
          break
        case 'chats.delete':
          await chatsDelete(e[key] ?? [])
          break
        case 'chats.update':
        case 'chats.upsert':
          await chatsUpdate(e[key] ?? [])
          break
        case 'contacts.update':
        case 'contacts.upsert':
          await contactsUpdate(e[key] ?? [])
          break
        case 'messages.delete':
          await messageDelete(e[key] ?? { keys: [] })
          break
        case 'messages.update':
          await messageUpdate(e[key] ?? [])
          break
        case 'messages.upsert':
          await messagesUpsert(e[key] ?? { messages: [] })
          break
        case 'lid-mapping.update':
          await lidMappingUpdate(e[key] ? [e[key]] : [])
          break
        default:
          logger.warn(`Received unhandled WhatsApp event with key ${key} and value ${JSON.stringify(e[key])}`)
      }
    }
  })

  return {
    async reset() {
      await transactional(async (client) => {
        await cleanWhatsAppDataOfOwner(client, owner)
      })
    },
  }
}

function filterIrrelevantChats(input: Partial<Chat>): boolean {
  if (!input.id) return false
  return true
}

function toChat(c: (Chat)): Partial<ChatInput> & { id: string } {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const id = c.id!
  const is_group = id.endsWith('@g.us') || id.endsWith('@newsletter')
  const name = is_group ? (c.name ?? c.displayName ?? undefined) : undefined
  const lastTimestamp = c.messages?.[0]?.message?.messageTimestamp ? new Date(toNumber(c.messages[0].message.messageTimestamp) * 1000).toISOString() : undefined
  return { id, is_group, unread_count: c.unreadCount ?? undefined, archived: c.archived ?? undefined, name, last_message_timestamp: lastTimestamp }
}

function filterIrrelevantContacts(input: Partial<Contact>): boolean {
  if (!input.id) return false
  return true
}

function toContact(c: Partial<Contact>): Partial<ContactInput> & { id: string } {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const id = c.id ?? c.lid!
  const name = c.name ?? c.notify ?? c.verifiedName ?? c.username
  return { id, name }
}

function filterIrrelevantMessages(key: WAMessageKey, m: Partial<WAMessage>): boolean {
  if (m.message?.protocolMessage) return false // We don't care about protocol messages (e.g. message deletions from other clients)
  if (!m.message) return false // We don't want to store messages without content, those are usually just placeholders for deleted messages or messages that failed to send
  if (!key.id) logger.warn(`Received update for entity without id, skipping. Entity data: ${JSON.stringify({ key, m })}`)
  return !!key.id
}

function toMessage(key: WAMessageKey, m: Partial<WAMessage>): Partial<MessageInput> & { id: string } {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const id = key.id!
  const chat_id = key.remoteJid ?? undefined
  const sender_id = getSenderId(key, m)
  const content = m.message ? getMessageContent(m.message) : undefined
  const mentioned = m.isMentionedInStatus ?? undefined
  const timestamp = m.messageTimestamp ? new Date(toNumber(m.messageTimestamp) * 1000).toISOString() : undefined
  return { id, chat_id, sender_id, content, mentioned, timestamp }
}

function getSenderId(key: WAMessageKey, m: Partial<WAMessage>): string | undefined {
  if (key.fromMe) return undefined
  if (!key.remoteJid) {
    logger.warn(`Received message without remoteJid, skipping. Message key data: ${JSON.stringify(key)}, message data: ${JSON.stringify(m)}`)
    return undefined
  }
  const is_group = key.remoteJid.endsWith('@g.us') || key.remoteJid.endsWith('@newsletter')
  if (is_group) {
    if (!m.participant) logger.warn(`Received message for group chat without participant id, skipping. Message key data: ${JSON.stringify(key)}, message data: ${JSON.stringify(m)}`)
    return m.participant ?? undefined
  }
  return key.remoteJid
}

function getMessageContent(message: proto.IMessage): string {
  if (message.conversation) return message.conversation
  if (message.extendedTextMessage) return message.extendedTextMessage.text ?? '[Extended text message]'
  if (message.imageMessage) return '[Image: ' + (message.imageMessage.caption ?? 'no text') + ']'
  if (message.videoMessage) return '[Video: ' + (message.videoMessage.caption ?? 'no text') + ']'
  if (message.documentMessage) return '[Document: ' + (message.documentMessage.caption ?? 'no text') + ']'
  if (message.locationMessage) return '[Location: ' + (message.locationMessage.comment ?? 'no text') + ']'
  if (message.liveLocationMessage) return '[LiveLocation: ' + (message.liveLocationMessage.caption ?? 'no text') + ']'
  if (message.stickerMessage) return '[Sticker]'
  if (message.albumMessage) return '[Album]'
  if (message.audioMessage) return '[Audio]'
  if (message.pollCreationMessageV3) return '[Poll: ' + (message.pollCreationMessageV3.name ?? 'no text') + ']'
  // TODO: Handle the filled out template?
  if (message.templateMessage) return '[Template]'
  // TODO: Should we filter those messages out instead of returning a placeholder content?
  if (message.associatedChildMessage) return '[Associated child message]'
  logger.warn(`Unknown message type: ${JSON.stringify(message, null, 2)}`)
  return '[Unknown message type]'
}
