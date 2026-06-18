import { BaileysEventMap, BufferJSON, Chat, ChatUpdate, Contact, proto, toNumber, WAMessage, WAMessageKey, WAMessageUpdate } from '@whiskeysockets/baileys'
import { ChatInput, cleanWhatsAppDataOfOwner, ContactInput, deleteChatsById, deleteMessages, MessageInput, updateChats, updateContacts, updateMessages } from '../../_data/Whatsapp'
import { logger } from '@/app/shared/logger'
import { Mutex } from 'async-mutex'
import { PoolClient } from 'pg'
import { transactional } from '@/app/shared/_external/db/access'
import { promises as fsp } from 'fs'
import { LIDMappingStore } from '@whiskeysockets/baileys/lib/Signal/lid-mapping'
import { tmpdir } from 'os'

export interface Processor { process: (handler: (events: Partial<BaileysEventMap>) => Promise<void>) => void }

export interface WhatsAppStore {
  onInitialSyncFinished: (readyCallback: (() => void)) => void
  reset: () => Promise<void>
  bind: (ev: Processor) => void
  setLidMappingStore: (store: LIDMappingStore) => void
}

const mutex = new Mutex()

export function createStore(owner: string): WhatsAppStore {
  let readyCallback: (() => void) | undefined = undefined
  let lidMappingStore: LIDMappingStore | undefined = undefined
  let noNewMessagesTimeout: NodeJS.Timeout | undefined = undefined

  async function setHistory(event: { chats: Chat[], contacts: Contact[], messages: WAMessage[] }) {
    const chatInput = await Promise.all(event.chats.filter(filterIrrelevantChats).map(c => toChat(c)))
    const contactInput = await Promise.all(event.contacts.filter(filterIrrelevantContacts).map(c => toContact(c)))
    const messageInput = await Promise.all(event.messages.filter(u => filterIrrelevantMessages(u)).map(u => toMessage(u)))
    await runInSequenceAndTransactional(async (client) => {
      await updateContacts(client, owner, contactInput)
      await updateChats(client, owner, chatInput)
      await updateMessages(client, owner, messageInput)
    })
  }

  async function chatsDelete(event: string[]) {
    await runInSequenceAndTransactional(async (client) => {
      await deleteChatsById(client, owner, event)
    })
  }

  async function chatsUpdate(event: ChatUpdate[]) {
    const chatInputs = await Promise.all(event.filter(filterIrrelevantChats).map(c => toChat(c)))
    await runInSequenceAndTransactional(async (client) => {
      await updateChats(client, owner, chatInputs)
    })
    const messagesInput = event.flatMap(e => e.messages?.flatMap(m => m.message ? [m.message] : []) ?? []).flatMap(m => m.key ? [{ ...m, key: m.key }] : [])
    const messages = await Promise.all(messagesInput.filter(u => filterIrrelevantMessages(u)).map(u => toMessage(u)))
    await runInSequenceAndTransactional(async (client) => {
      await updateMessages(client, owner, messages)
    })
  }

  function filterIrrelevantChats(input: Partial<Chat>): input is Partial<Chat> & { id: string } {
    if (!input.id) return false
    return true
  }

  async function toChat(c: Chat & { id: string }): Promise<Partial<ChatInput> & { id: string }> {
    const pn = await getPn(c.id)
    const is_group = !!pn && (pn.endsWith('@g.us') || pn.endsWith('@newsletter'))
    const name = is_group ? (c.name ?? c.displayName ?? undefined) : undefined
    const lastTimestamp = c.messages?.[0]?.message?.messageTimestamp ? new Date(toNumber(c.messages[0].message.messageTimestamp) * 1000).toISOString() : undefined
    const id = await getLid(c.id) ?? c.id
    return { id, pn, is_group, unread_count: c.unreadCount ?? undefined, archived: c.archived ?? undefined, name, last_message_timestamp: lastTimestamp }
  }

  async function contactsUpdate(event: Partial<Contact>[]) {
    const inputs = await Promise.all(event.filter(filterIrrelevantContacts).map(c => toContact(c)))
    await runInSequenceAndTransactional(async (client) => {
      await updateContacts(client, owner, inputs)
    })
  }

  function filterIrrelevantContacts(input: Partial<Contact>): input is Partial<Contact> & { id: string } {
    if (!input.id) return false
    if (input.id.endsWith('@g.us') || input.id.endsWith('@newsletter')) return false // We don't want to store group chats as contacts, those are stored as chats
    return true
  }

  async function toContact(c: Partial<Contact> & { id: string }): Promise<Partial<ContactInput> & { lid: string }> {
    const pn = await getPn(c.id)
    let name = c.name ?? c.notify ?? c.verifiedName ?? c.username
    if (name?.includes('∙∙∙∙∙∙∙')) {
      name = undefined
      logger.warn(`Contact name for contact with id ${c.id} is obfuscated, ignore it. Contact data: ${JSON.stringify(c)}`)
    }

    let lid = await getLid(c.id)
    if (!lid) {
      lid = Math.random().toString(36).substring(2) + '@lid'
      logger.warn(`Could not find LID for contact with id ${c.id}. Generate ranom lid ${lid}. Contact data: ${JSON.stringify(c)}`)
    }
    return { pn, lid, name }
  }

  async function messageDelete(event: { keys: WAMessageKey[] } | { jid: string, all: true }) {
    const ids = 'jid' in event ? [event.jid] : event.keys.map(k => k.id ?? '').filter(id => !!id)
    await runInSequenceAndTransactional(async (client) => {
      await deleteMessages(client, owner, ids)
    })
  }

  async function messageUpdate(event: WAMessageUpdate[]) {
    const inputs = await Promise.all(event.map(u => ({ ...u.update, key: u.key })).filter(u => filterIrrelevantMessages(u)).map(u => toMessage(u)))
    await runInSequenceAndTransactional(async (client) => {
      await updateMessages(client, owner, inputs)
    })
  }

  async function messagesUpsert(event: { messages: WAMessage[] }) {
    const inputs = await Promise.all(event.messages.filter(u => filterIrrelevantMessages(u)).map(u => toMessage(u)))
    await runInSequenceAndTransactional(async (client) => {
      await updateMessages(client, owner, inputs)
    })
  }

  function filterIrrelevantMessages(m: Partial<WAMessage>): m is { key: { id: string, remoteJid: string } } {
    if (m.message?.protocolMessage) return false // We don't care about protocol messages (e.g. message deletions from other clients)
    if (!m.message) return false // We don't want to store messages without content, those are usually just placeholders for deleted messages or messages that failed to send
    if (!m.key) return false
    if (!m.key.id) logger.warn(`Received update for entity without id, skipping. Entity data: ${JSON.stringify({ key: m.key, m })}`)
    if (!m.key.remoteJid) logger.warn(`Received update for entity without remoteJid, skipping. Entity data: ${JSON.stringify({ key: m.key, m })}`)
    return !!m.key.id && !!m.key.remoteJid
  }

  async function toMessage(m: Partial<WAMessage> & { key: { id: string, remoteJid: string } }): Promise<Partial<MessageInput> & { id: string }> {
    const chat_id = await getLid(m.key.remoteJid) ?? m.key.remoteJid
    const sender_id = getSenderId(m.key, m)
    const content = m.message ? getMessageContent(m.message) : undefined
    const mentioned = m.isMentionedInStatus ?? undefined
    const timestamp = m.messageTimestamp ? new Date(toNumber(m.messageTimestamp) * 1000).toISOString() : undefined
    return { id: m.key.id, chat_id, sender_id, content, mentioned, timestamp }
  }

  function getSenderId(key: proto.IMessageKey, m: Partial<WAMessage>): string | undefined {
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
    if (message.templateMessage) return '[Template]'
    logger.warn(`Unknown message type: ${JSON.stringify(message, null, 2)}`)
    return '[Unknown message type]'
  }

  async function getLid(id: string): Promise<string | undefined> {
    if (id.endsWith('@lid')) return id
    if (!lidMappingStore) {
      logger.error('LID mapping store not set in WhatsApp sync store')
      return undefined
    }
    const lid = await lidMappingStore.getLIDForPN(id)
    return lid ?? undefined
  }

  async function getPn(id: string): Promise<string | undefined> {
    if (!id.endsWith('@lid')) return id
    if (!lidMappingStore) {
      logger.error('LID mapping store not set in WhatsApp sync store')
      return undefined
    }
    const pn = await lidMappingStore.getPNForLID(id)
    return pn ?? undefined
  }

  async function process(e: Partial<BaileysEventMap>) {
    const multiLine = JSON.stringify(e, BufferJSON.replacer, 2)
    await fsp.appendFile(`${tmpdir()}/whatsapp-events.log`, multiLine + '\n')

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
      }
    }
  }

  async function runInSequenceAndTransactional<T>(fn: (client: PoolClient) => Promise<T>): Promise<void> {
    return mutex.runExclusive(async () => {
      if (noNewMessagesTimeout) clearTimeout(noNewMessagesTimeout)
      await transactional(fn)
      if (readyCallback)
        noNewMessagesTimeout = setTimeout(() => {
          logger.debug('No new WhatsApp messages for 1s, initial sync finished')
          readyCallback?.()
          readyCallback = undefined
        }, 1000)
    })
  }

  return {
    bind(ev: Processor) { ev.process(process) },
    setLidMappingStore(store: LIDMappingStore) { lidMappingStore = store },
    async reset() { await runInSequenceAndTransactional(client => cleanWhatsAppDataOfOwner(client, owner)) },
    onInitialSyncFinished(cb: (() => void)) { readyCallback = cb },
  }
}
