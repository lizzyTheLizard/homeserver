import { Entity, Queryable, removeNull } from '@/app/shared/_external/db/access'

export interface AuthStateInput {
  creds: string
  keys: string
}

export interface ChatInput {
  id: string
  pn: string | undefined
  name: string | undefined
  is_group: boolean
  unread_count: number | undefined
  archived: boolean | undefined
  last_message_timestamp: string | undefined
}

export interface MessageInput {
  id: string
  chat_id: string
  sender_id?: string
  content: string
  mentioned?: boolean
  timestamp: string
}

export interface ContactInput {
  pn: string
  lid: string
  name: string | undefined
}

export type Chat = Entity<ChatInput>
export type Message = Entity<MessageInput>
export type Contact = Entity<ContactInput>
export type AuthState = Entity<AuthStateInput>

export interface HistoryUpdate {
  authState: AuthStateInput
  chats: ChatInput[]
  contacts: ContactInput[]
  messages: MessageInput[]
  clean: boolean
}

export async function findChatsByOwner(client: Queryable, ownerEmail: string): Promise<Chat[]> {
  const result = await client.query<Chat>(
    'SELECT * FROM wa_chat WHERE owner_email = $1 ORDER BY name ASC',
    [ownerEmail],
  )
  return result.rows.map(removeNull)
}

export async function findMessagesByChatId(client: Queryable, ownerEmail: string, chatId: string): Promise<Message[]> {
  const result = await client.query<Message>(
    'SELECT * FROM wa_message WHERE owner_email = $1 AND chat_id = $2 ORDER BY timestamp DESC',
    [ownerEmail, chatId],
  )
  return result.rows.map(removeNull)
}

export async function findAuthStateByOwner(client: Queryable, ownerEmail: string): Promise<AuthState | undefined> {
  const result = await client.query<AuthState>(
    'SELECT creds FROM wa_auth WHERE owner_email = $1',
    [ownerEmail],
  )
  return removeNull(result.rows[0])
}

export async function findContactsByOwner(client: Queryable, ownerEmail: string): Promise<Contact[]> {
  const result = await client.query<Contact>(
    'SELECT * FROM wa_contact WHERE owner_email = $1 ORDER BY name ASC',
    [ownerEmail],
  )
  return result.rows.map(removeNull)
}

export async function cleanWhatsAppDataOfOwner(client: Queryable, ownerEmail: string): Promise<void> {
  await client.query('DELETE FROM wa_auth WHERE owner_email = $1', [ownerEmail])
  await client.query('DELETE FROM wa_chat WHERE owner_email = $1', [ownerEmail])
  await client.query('DELETE FROM wa_message WHERE owner_email = $1', [ownerEmail])
  await client.query('DELETE FROM wa_contact WHERE owner_email = $1', [ownerEmail])
}

export async function updateAuthState(client: Queryable, ownerEmail: string, authState: AuthStateInput): Promise<void> {
  await client.query(
    `INSERT INTO wa_auth (owner_email, creds, keys, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (owner_email) DO UPDATE SET
       creds      = EXCLUDED.creds,
       keys       = EXCLUDED.keys,
       updated_at = NOW()`,
    [ownerEmail, authState.creds, authState.keys],
  )
}

export async function deleteChatsById(client: Queryable, ownerEmail: string, chatIds: string[]): Promise<void> {
  for (const chatId of chatIds) {
    await client.query('DELETE FROM wa_message WHERE owner_email = $1 AND chat_id = $2', [ownerEmail, chatId])
    await client.query('DELETE FROM wa_chat WHERE owner_email = $1 AND (id = $2 OR pn = $2)', [ownerEmail, chatId])
  }
}

export async function updateChats(client: Queryable, ownerEmail: string, chat: (Partial<ChatInput> & { id: string })[]): Promise<void> {
  for (const c of chat) {
    await client.query(
      `INSERT INTO wa_chat (id, pn, owner_email, name, is_group, unread_count, archived, last_message_timestamp, created_at, updated_at )
       VALUES ($1, $2, $3, $4, COALESCE($5, FALSE), $6, $7, $8, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         name          = COALESCE($4, wa_chat.name),
         is_group      = COALESCE($5, wa_chat.is_group),
         unread_count  = COALESCE($6, wa_chat.unread_count),
         archived      = COALESCE($7, wa_chat.archived),
         last_message_timestamp = COALESCE($8, wa_chat.last_message_timestamp),
         updated_at    = NOW()`,
      [c.id, c.pn, ownerEmail, c.name, c.is_group, c.unread_count, c.archived, c.last_message_timestamp],
    )
  }
}

export async function updateContacts(client: Queryable, ownerEmail: string, contacts: (Partial<ContactInput> & { lid: string })[]): Promise<void> {
  for (const contact of contacts) {
    await client.query(
      `INSERT INTO wa_contact (lid, pn, owner_email, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (lid) DO UPDATE SET
         pn           = COALESCE($2, wa_contact.pn),
         name         = COALESCE($4, wa_contact.name),
         updated_at   = NOW()`,
      [contact.lid, contact.pn, ownerEmail, contact.name],
    )
  }
}

export async function deleteMessages(client: Queryable, ownerEmail: string, messageIds: string[]): Promise<void> {
  for (const messageId of messageIds) {
    await client.query('DELETE FROM wa_message WHERE owner_email = $1 AND id = $2', [ownerEmail, messageId])
  }
}

export async function updateMessages(client: Queryable, ownerEmail: string, messages: (Partial<MessageInput> & { id: string })[]): Promise<void> {
  for (const msg of messages) {
    await client.query(
      `INSERT INTO wa_message (id, owner_email, chat_id, sender_id, mentioned, content, timestamp, created_at, updated_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, FALSE), $6, $7, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         chat_id      = COALESCE($3, wa_message.chat_id),
         sender_id    = COALESCE($4, wa_message.sender_id),
         mentioned    = COALESCE($5, wa_message.mentioned),
         content      = COALESCE($6, wa_message.content),
         timestamp    = COALESCE($7, wa_message.timestamp),
         updated_at   = NOW()`,
      [msg.id, ownerEmail, msg.chat_id, msg.sender_id, msg.mentioned, msg.content, msg.timestamp],
    )
  }
}
