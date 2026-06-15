// TODO Generate tests.

import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { afterAll, beforeEach, describe, expect, test } from 'vitest'
import { cleanWhatsAppDataOfOwner, findChatsByOwner, findContactsByOwner, findMessagesByChatId } from '../../_data/Chat'
import { createStore, Processor } from './store'
import { BaileysEventMap, WAMessage } from '@whiskeysockets/baileys'
import { existsSync, promises as fsp } from 'fs'

describe('whatsapp store', () => {
  afterAll(() => {
    // Clear all projects before starting tests
    return transactional(async (tx) => {
      await cleanWhatsAppDataOfOwner(tx, 'test')
    })
  })

  beforeEach(async () => {
    // Clean up all projects after each test
    await transactional(async (tx) => {
      await cleanWhatsAppDataOfOwner(tx, 'test')
    })
  })

  test('irrelevant updates', async () => {
    const processor = createMockEmittor()
    createStore('test', processor)
    await processor.emit({ 'connection.update': { connection: 'connecting', receivedPendingNotifications: false } })
    await processor.emit({ 'creds.update': { lastAccountSyncTimestamp: 1781247212 } })
    await processor.emit({ 'messaging-history.status': { syncType: 0, status: 'complete', explicit: true } })
    await expect(nontransactional(c => findChatsByOwner(c, 'test'))).resolves.toEqual([])
    await expect(nontransactional(c => findContactsByOwner(c, 'test'))).resolves.toEqual([])
  })

  test('sync chats', async () => {
    const processor = createMockEmittor()
    createStore('test', processor)

    await processor.emit({ 'messaging-history.set': { chats: [groupChat], contacts: [], messages: [], syncType: 1 } })
    await expect(nontransactional(c => findChatsByOwner(c, 'test'))).resolves.toEqual([
      { owner_email: 'test', id: groupId, name: groupChat.name, is_group: true, unread_count: groupChat.unreadCount, archived: groupChat.archived, last_message_timestamp: '2026-06-12 01:17:36+01', updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
    ])

    await processor.emit({ 'messaging-history.set': { chats: [contactChat], contacts: [], messages: [], syncType: 1 } })
    await expect(nontransactional(c => findChatsByOwner(c, 'test'))).resolves.toEqual([
      { owner_email: 'test', id: groupId, name: groupChat.name, is_group: true, unread_count: groupChat.unreadCount, archived: groupChat.archived, last_message_timestamp: '2026-06-12 01:17:36+01', updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
      { owner_email: 'test', id: contactChat.id, name: undefined, is_group: false, unread_count: contactChat.unreadCount, archived: contactChat.archived, last_message_timestamp: '1994-10-02 20:46:52+01', updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
    ])

    const newName = 'newName'
    await processor.emit({ 'chats.update': [{ id: groupId, name: newName, unreadCount: 2, archived: true }] })
    await expect(nontransactional(c => findChatsByOwner(c, 'test'))).resolves.toEqual([
      { owner_email: 'test', id: groupId, name: newName, is_group: true, unread_count: 2, archived: true, last_message_timestamp: '2026-06-12 01:17:36+01', updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
      { owner_email: 'test', id: contactChat.id, name: undefined, is_group: false, unread_count: contactChat.unreadCount, archived: contactChat.archived, last_message_timestamp: '1994-10-02 20:46:52+01', updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
    ])

    await processor.emit({ 'chats.delete': [groupId] })
    await expect(nontransactional(c => findChatsByOwner(c, 'test'))).resolves.toEqual([
      { owner_email: 'test', id: contactChat.id, name: undefined, is_group: false, unread_count: contactChat.unreadCount, archived: contactChat.archived, last_message_timestamp: '1994-10-02 20:46:52+01', updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
    ])

    const newContactId = 'new@lid'
    await processor.emit({ 'chats.upsert': [{ id: newContactId }] })
    await expect(nontransactional(c => findChatsByOwner(c, 'test'))).resolves.toEqual([
      { owner_email: 'test', id: contactChat.id, name: undefined, is_group: false, unread_count: contactChat.unreadCount, archived: contactChat.archived, last_message_timestamp: '1994-10-02 20:46:52+01', updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
      { owner_email: 'test', id: newContactId, name: undefined, is_group: false, unread_count: undefined, archived: undefined, last_message_timestamp: undefined, updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
    ])
  })

  test('reset', async () => {
    const processor = createMockEmittor()
    const store = createStore('test', processor)

    await processor.emit({ 'messaging-history.set': { chats: [{ id: 'chatId', unreadCount: 1, archived: false }], contacts: [{ id: 'contactId', name: 'test' }], messages: [], syncType: 1 } })
    await expect(nontransactional(c => findChatsByOwner(c, 'test'))).resolves.toHaveLength(1)
    await expect(nontransactional(c => findContactsByOwner(c, 'test'))).resolves.toHaveLength(1)

    await store.reset()
    await expect(nontransactional(c => findChatsByOwner(c, 'test'))).resolves.toHaveLength(0)
    await expect(nontransactional(c => findContactsByOwner(c, 'test'))).resolves.toHaveLength(0)
  })

  test('sync contacts', async () => {
    const processor = createMockEmittor()
    createStore('test', processor)

    await processor.emit({ 'messaging-history.set': { chats: [], contacts: [contact], messages: [], syncType: 1 } })
    await expect(nontransactional(c => findContactsByOwner(c, 'test'))).resolves.toEqual([
      { owner_email: 'test', id: contactId, name: undefined, updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
    ])

    const newName = 'newName'
    await processor.emit({ 'contacts.update': [{ id: contactId, name: newName }] })
    await expect(nontransactional(c => findContactsByOwner(c, 'test'))).resolves.toEqual([
      { owner_email: 'test', id: contactId, name: newName, updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
    ])

    await processor.emit({ 'contacts.upsert': [groupContact] })
    await expect(nontransactional(c => findContactsByOwner(c, 'test'))).resolves.toEqual([
      { owner_email: 'test', id: contactId, name: newName, updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
      { owner_email: 'test', id: groupContact.id, name: groupContact.name, updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
    ])
  })

  test('sync messages', async () => {
    const processor = createMockEmittor()
    createStore('test', processor)

    await processor.emit({ 'messaging-history.set': { chats: [groupChat], contacts: [], messages: [groupMessage], syncType: 1 } })
    await expect(nontransactional(c => findMessagesByChatId(c, 'test', groupId))).resolves.toEqual([
      { owner_email: 'test', id: groupMessage.key.id, chat_id: groupId, content: groupMessage.message.extendedTextMessage.text, mentioned: false, sender_id: groupMessage.participant, timestamp: expect.any(String) as string, updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
    ])

    await processor.emit({ 'messaging-history.set': { chats: [contactChat], contacts: [], messages: [contactMessage], syncType: 1 } })
    await expect(nontransactional(c => findMessagesByChatId(c, 'test', contactId))).resolves.toEqual([
      { owner_email: 'test', id: contactMessage.key.id, chat_id: contactId, content: contactMessage.message.conversation, mentioned: false, sender_id: contactId, timestamp: expect.any(String) as string, updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
    ])
  })

  test('Sync messages from myself', async () => {
    const processor = createMockEmittor()
    createStore('test', processor)

    const myMessage: WAMessage = { ...contactMessage, key: { ...contactMessage.key, fromMe: true } }
    await processor.emit({ 'messaging-history.set': { chats: [contactChat], contacts: [], messages: [myMessage], syncType: 1 } })
    await expect(nontransactional(c => findMessagesByChatId(c, 'test', contactId))).resolves.toEqual([
      { owner_email: 'test', id: contactMessage.key.id, chat_id: contactId, content: contactMessage.message.conversation, mentioned: false, sender_id: undefined, timestamp: expect.any(String) as string, updated_at: expect.any(String) as string, created_at: expect.any(String) as string },
    ])
  })

  test.skipIf(!existsSync(__dirname + '/testdata.json'))('fullload', async () => {
    const processor = createMockEmittor()
    createStore('test', processor)

    const fileContent = await fsp.readFile(__dirname + '/testdata.json', 'utf-8')
    const fullload = JSON.parse(fileContent) as BaileysEventMap[]
    for (const event of fullload) {
      await processor.emit(event)
    }
    await expect(nontransactional(c => findChatsByOwner(c, 'test'))).resolves.toHaveLength(635)
    await expect(nontransactional(c => findContactsByOwner(c, 'test'))).resolves.toHaveLength(662)
  })
})

function createMockEmittor(): Processor & { emit: (event: Partial<BaileysEventMap>) => Promise<void> } {
  const result: Processor & { emit: (event: Partial<BaileysEventMap>) => Promise<void> } = {
    emit: () => Promise.reject(new Error('Not initialized')),
    process: () => { throw new Error('Not initialized') },
  }
  result.process = (handler) => { result.emit = handler }
  return result
}

const groupId = '120363422812012748@g.us'

const groupMessage = {
  key: {
    remoteJid: groupId,
    fromMe: false,
    id: 'AC0983A07B6A183FC65024214DC21ED3',
  },
  message: {
    extendedTextMessage: {
      text: 'Das ist ein test 😜',
      previewType: 0,
      contextInfo: {
        stanzaId: 'AC73AF371AB19E015F30A2452581D340',
        participant: '211947329173856@lid',
        quotedMessage: {
          conversation: 'Quoted text',
        },
        quotedType: 0,
      },
      inviteLinkGroupTypeV2: 0,
    },
    messageContextInfo: {
      messageSecret: new Uint8Array([1, 2, 3]),
    },
  },
  messageTimestamp: 1781223456,
  participant: '217392713006437@lid',
  messageSecret: new Uint8Array([1, 2, 3]),
  reportingTokenInfo: {
    reportingTag: new Uint8Array([4, 5, 6]),
  },
  isMentionedInStatus: false,
}

const groupChat = {
  id: groupId,
  messages: [
    {
      message: groupMessage,
    },
  ],
  unreadCount: 9,
  readOnly: false,
  ephemeralExpiration: 0,
  ephemeralSettingTimestamp: 0,
  conversationTimestamp: 1781202346,
  name: '🏬⛹🏽‍♀️🌾 Group Name 🌳🌱🌸',
  pHash: '1:UOVTiz+t',
  notSpam: false,
  archived: false,
  disappearingMode: {
    initiator: 0,
  },
  unreadMentionCount: 0,
  markedAsUnread: false,
  suspended: false,
  isDefaultSubgroup: false,
  commentsCount: 1000000,
  locked: false,
}

const groupContact = {
  id: groupId,
  name: '🏬⛹🏽‍♀️🌾 Group Name 🌳🌱🌸',
}

const contactId = '41797291365@s.whatsapp.net'

const contact = {
  id: contactId,
  lid: '40604687938382@lid',
  phoneNumber: '41797291365@s.whatsapp.net',
}

const contactMessage = {
  key: {
    remoteJid: contactId,
    fromMe: false,
    id: 'ACF1289E182D62F1723771D73B32ABFE',
  },
  message: {
    conversation: 'Kein Problem',
    messageContextInfo: {
      messageSecret: new Uint8Array([1, 2, 3]),
    },
  },
  messageTimestamp: 781127212,
  status: 3,
  userReceipt: [
    {
      userJid: contactId,
      receiptTimestamp: 781127214,
      readTimestamp: 0,
      playedTimestamp: 0,
    },
  ],
  messageSecret: new Uint8Array([1, 2, 3]),
  originalSelfAuthorUserJidString: '41796111111@s.whatsapp.net',
  isMentionedInStatus: false,
}

const contactChat = {
  id: contactId,
  messages: [
    {
      message: contactMessage,
    },
  ],
  unreadCount: 0,
  readOnly: false,
  ephemeralExpiration: 0,
  ephemeralSettingTimestamp: 1695499213,
  conversationTimestamp: 1781123832,
  notSpam: true,
  archived: false,
  disappearingMode: {
    initiator: 0,
  },
  unreadMentionCount: 0,
  markedAsUnread: false,
  tcToken: new Uint8Array([1, 2, 3]),
  tcTokenTimestamp: 1781122232,
  contactPrimaryIdentityKey: new Uint8Array([4, 5, 6]),
  tcTokenSenderTimestamp: 1780851234,
  pnJid: contactId,
  shareOwnPn: true,
  lidOriginType: 'general',
  commentsCount: 1000000,
  locked: false,
  accountLid: contact.lid,
}
