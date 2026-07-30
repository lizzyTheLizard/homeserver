import { Queryable, removeNull } from '@/app/shared/_external/db/access'
import { logger } from '@/app/shared/logger'
import crypto from 'crypto'

export interface WhatsAppStore {
  auth: string
  chats: Record<string, string>
  contacts: Record<string, string>
  messages: Record<string, string>
}

export async function getWhatsappState(client: Queryable, ownerEmail: string): Promise<WhatsAppStore | undefined> {
  const authResult = await client.query<{ auth: string }>('SELECT auth FROM wa_auth WHERE owner_email = $1', [ownerEmail])
  if (authResult.rows.length === 0) return undefined
  const auth = removeNull(authResult.rows[0]).auth
  const data = await client.query<{ type: string, id: string, obj: string }>('SELECT type, id, obj FROM wa_data WHERE owner_email = $1', [ownerEmail])
  const chats: Record<string, string> = {}
  const contacts: Record<string, string> = {}
  const messages: Record<string, string> = {}
  for (const row of data.rows) {
    if (row.type === 'chat') chats[row.id] = row.obj
    else if (row.type === 'contact') contacts[row.id] = row.obj
    else if (row.type === 'message') messages[row.id] = row.obj
  }
  return { auth, chats, contacts, messages }
}

export async function setWhatsappState(client: Queryable, ownerEmail: string, data: WhatsAppStore): Promise<void> {
  const totalStart = Date.now()

  // First update the auth data. This is a single row, so we can just update it.
  const resultAuth = await client.query('SELECT * FROM wa_auth WHERE owner_email = $1', [ownerEmail])
  if (resultAuth.rows.length > 0)
    await client.query('UPDATE wa_auth SET auth = $1 WHERE owner_email = $2', [data.auth, ownerEmail])
  else
    await client.query('INSERT INTO wa_auth (owner_email, auth) VALUES ($1, $2)', [ownerEmail, data.auth])

  // Collect all data to be inserted/updated/deleted
  const rows: { type: string, id: string, obj: string, hash: string }[] = []
  for (const [id, obj] of Object.entries(data.chats)) rows.push({ type: 'chat', id, obj, hash: getHash(obj) })
  for (const [id, obj] of Object.entries(data.contacts)) rows.push({ type: 'contact', id, obj, hash: getHash(obj) })
  for (const [id, obj] of Object.entries(data.messages)) rows.push({ type: 'message', id, obj, hash: getHash(obj) })

  // Get the existing data from the database.
  const resultExisting = await client.query<ExistingWhatsAppDataRow>('SELECT type, id, hash FROM wa_data WHERE owner_email = $1', [ownerEmail])
  const existingData = resultExisting.rows

  // Now we can delete the staled data, update the changed data and insert the new data.
  await deleteStaledData(client, ownerEmail, existingData, rows)
  await updateChangedData(client, ownerEmail, existingData, rows)
  await insertNewData(client, ownerEmail, existingData, rows)

  logger.debug(`WhatsApp state for owner ${ownerEmail} set in ${(Date.now() - totalStart).toString()}ms`)
}

function getHash(obj: string): string {
  return crypto.createHash('md5').update(obj).digest('hex')
}

async function deleteStaledData(client: Queryable, ownerEmail: string, existingData: ExistingWhatsAppDataRow[], rows: WhatsAppDataRow[]): Promise<void> {
  // Delete all rows that are not in the new data any more
  const toDelete = existingData.filter(row => !rows.some(r => r.type === row.type && r.id === row.id)).map(row => row.id)
  await client.query('DELETE FROM wa_data WHERE owner_email = $1 AND id IN ($2)', [ownerEmail, toDelete])
}

const batchSize = 100
const maxBatches = 100

async function updateChangedData(client: Queryable, ownerEmail: string, existingData: ExistingWhatsAppDataRow[], rows: WhatsAppDataRow[]): Promise<void> {
  // With the update we have to trick a bit... There can be A LOT of rows, so we have to do it in batches
  const toUpdate = rows.filter(row => existingData.some(r => r.type === row.type && r.id === row.id && r.hash !== row.hash))
  let alredyInserted = 0
  for (let i = 0; i < maxBatches; i += 1) {
    const batch = toUpdate.slice(alredyInserted, alredyInserted + batchSize)
    // Check if we are done
    if (batch.length === 0) {
      return
    }
    // Pg does not directely support updating multiple rows. So we have to create the query manually. Use placeholders for the values to avoid SQL injection.
    let placeholderCounter = 1
    const query = `UPDATE wa_data SET obj = data.dobj, hash = data.dhash FROM (VALUES ${batch.map(b => `('${ownerEmail}', '${b.type}', $${(placeholderCounter++).toString()}, $${(placeholderCounter++).toString()}, '${b.hash}')`).join(', ')}) AS data(downer, dtype, did, dobj, dhash)  WHERE owner_email = data.downer AND type = data.dtype AND id = data.did `
    const params = batch.flatMap(b => [b.id, b.obj])
    await client.query(query, params)
    alredyInserted += batch.length
  }
  throw new Error(`Could not update all data in ${maxBatches.toString()} Batches. This should never happen.`)
}

async function insertNewData(client: Queryable, ownerEmail: string, existingData: ExistingWhatsAppDataRow[], rows: WhatsAppDataRow[]): Promise<void> {
  // With the insert we have to trick a bit... There can be A LOT of rows, so we have to do it in batches
  const toInsert = rows.filter(row => !existingData.some(r => r.type === row.type && r.id === row.id))
  const batchSize = 100
  const maxBatches = 100
  let alredyInserted = 0
  for (let i = 0; i < maxBatches; i += 1) {
    const batch = toInsert.slice(alredyInserted, alredyInserted + batchSize)
    // Check if we are done
    if (batch.length === 0) {
      return
    }
    // Pg does not directely support inserting multiple rows. So we have to create the query manually. Use placeholders for the values to avoid SQL injection.
    let placeholderCounter = 1
    const query = `INSERT INTO wa_data (owner_email, type, id, obj, hash) VALUES ${batch.map(b => `('${ownerEmail}', '${b.type}', $${(placeholderCounter++).toString()}, $${(placeholderCounter++).toString()}, '${b.hash}')`).join(', ')};`
    const params = batch.flatMap(b => [b.id, b.obj])
    await client.query(query, params)
    alredyInserted += batch.length
  }
  throw new Error(`Could not enter all data in ${maxBatches.toString()} Batches. This should never happen.`)
}

interface WhatsAppDataRow {
  type: string
  id: string
  obj: string
  hash: string
}

interface ExistingWhatsAppDataRow {
  type: string
  id: string
  hash: string
}

export interface ChatRow {
  chat_jid: string
  last_msg_ts: string
  archived: boolean
  lid_pn: string
  pn_lid: string
  group_name: string
  direct_first_name: string
  direct_full_name: string
  direct_business_name: string
  lid_first_name: string
  lid_full_name: string
  lid_business_name: string
  pn_first_name: string
  pn_full_name: string
  pn_business_name: string
}

export interface MessageRow {
  id: string
  from_me: boolean
  sender_jid: string
  text: string | null
  message_timestamp: string
  contact_name: string
}

export async function getUserJID(client: Queryable, email: string): Promise<string | undefined> {
  const result = await client.query<{ our_jid: string }>(
    'SELECT device_id AS our_jid FROM whatsapp_users WHERE email = $1',
    [email],
  )
  if (!result.rows[0]) return undefined
  return removeNull(result.rows[0]).our_jid
}

export async function deleteUserData(client: Queryable, email: string): Promise<void> {
  const deviceResult = await client.query<{ device_id: string }>(
    'SELECT device_id FROM whatsapp_users WHERE email = $1', [email],
  )
  const deviceID = deviceResult.rows[0]?.device_id
  if (!deviceID) return

  await client.query('DELETE FROM whatsapp_messages WHERE our_jid = $1', [deviceID])
  await client.query('DELETE FROM whatsapp_groups WHERE our_jid = $1', [deviceID])
  await client.query('DELETE FROM whatsapp_users WHERE email = $1', [email])
  await client.query('DELETE FROM whatsmeow_device WHERE jid = $1', [deviceID])
  await client.query('DELETE FROM whatsmeow_identity WHERE our_jid = $1', [deviceID])
  await client.query('DELETE FROM whatsmeow_prekeys WHERE jid = $1', [deviceID])
  await client.query('DELETE FROM whatsmeow_sessions WHERE our_jid = $1', [deviceID])
  await client.query('DELETE FROM whatsmeow_sender_keys WHERE our_jid = $1', [deviceID])
  await client.query('DELETE FROM whatsmeow_app_state_sync_keys WHERE our_jid = $1', [deviceID])
  await client.query('DELETE FROM whatsmeow_app_state_version WHERE our_jid = $1', [deviceID])
  await client.query('DELETE FROM whatsmeow_contacts WHERE our_jid = $1', [deviceID])
  await client.query('DELETE FROM whatsmeow_chat_settings WHERE our_jid = $1', [deviceID])
  await client.query('DELETE FROM whatsmeow_message_secrets WHERE our_jid = $1', [deviceID])
  await client.query('DELETE FROM whatsmeow_privacy_tokens WHERE our_jid = $1', [deviceID])
  await client.query('DELETE FROM whatsmeow_app_state_mutation_macs WHERE our_jid = $1', [deviceID])
}

export async function getChats(client: Queryable, ourJID: string): Promise<ChatRow[]> {
  const result = await client.query<ChatRow>(`
    SELECT
      c.chat_jid,
      TO_CHAR(c.ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_msg_ts,
      COALESCE(cs.archived, cs_via_lid.archived, cs_via_pn.archived, FALSE) AS archived,
      COALESCE(lm.pn || '@s.whatsapp.net', '') AS lid_pn,
      COALESCE(lm2.lid || '@lid', '') AS pn_lid,
      COALESCE(g.group_name, '') AS group_name,
      COALESCE(co_direct.first_name, '') AS direct_first_name,
      COALESCE(co_direct.full_name, '') AS direct_full_name,
      COALESCE(co_direct.business_name, '') AS direct_business_name,
      COALESCE(co_via_lid.first_name, '') AS lid_first_name,
      COALESCE(co_via_lid.full_name, '') AS lid_full_name,
      COALESCE(co_via_lid.business_name, '') AS lid_business_name,
      COALESCE(co_via_pn.first_name, '') AS pn_first_name,
      COALESCE(co_via_pn.full_name, '') AS pn_full_name,
      COALESCE(co_via_pn.business_name, '') AS pn_business_name
    FROM (
      SELECT DISTINCT ON (chat_jid) chat_jid, ts
      FROM whatsapp_messages
      WHERE our_jid = $1 AND ts > NOW() - INTERVAL '1 year' AND chat_jid != 'status@broadcast'
      ORDER BY chat_jid, ts DESC
    ) c
    LEFT JOIN whatsmeow_lid_map lm ON lm.lid = replace(c.chat_jid, '@lid', '')
    LEFT JOIN whatsmeow_lid_map lm2 ON lm2.pn = replace(c.chat_jid, '@s.whatsapp.net', '')
    LEFT JOIN whatsmeow_chat_settings cs ON cs.chat_jid = c.chat_jid AND cs.our_jid = $1
    LEFT JOIN whatsmeow_chat_settings cs_via_lid ON cs_via_lid.chat_jid = lm.pn || '@s.whatsapp.net' AND cs_via_lid.our_jid = $1
    LEFT JOIN whatsmeow_chat_settings cs_via_pn ON cs_via_pn.chat_jid = lm2.lid || '@lid' AND cs_via_pn.our_jid = $1
    LEFT JOIN whatsapp_groups g ON g.group_jid = c.chat_jid AND g.our_jid = $1
    LEFT JOIN whatsmeow_contacts co_direct ON co_direct.their_jid = c.chat_jid AND co_direct.our_jid = $1
    LEFT JOIN whatsmeow_contacts co_via_lid ON co_via_lid.their_jid = lm.pn || '@s.whatsapp.net' AND co_via_lid.our_jid = $1
    LEFT JOIN whatsmeow_contacts co_via_pn ON co_via_pn.their_jid = lm2.lid || '@lid' AND co_via_pn.our_jid = $1
    ORDER BY c.ts DESC`,
  [ourJID],
  )
  return result.rows.map(r => removeNull(r))
}

export async function getMessagesForChat(client: Queryable, ourJID: string, chatJID: string): Promise<MessageRow[]> {
  const result = await client.query<MessageRow>(`
    SELECT
      m.id,
      m.from_me,
      m.sender_jid,
      m.text,
      TO_CHAR(m.ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS message_timestamp,
      COALESCE(
        co_direct.full_name, co_direct.first_name, co_direct.business_name,
        co_via_lid.full_name, co_via_lid.first_name, co_via_lid.business_name,
        co_via_pn.full_name, co_via_pn.first_name, co_via_pn.business_name,
        COALESCE(lm.pn || '@s.whatsapp.net', m.sender_jid)
      ) AS contact_name
    FROM whatsapp_messages m
    LEFT JOIN whatsmeow_lid_map lm ON lm.lid = replace(m.sender_jid, '@lid', '')
    LEFT JOIN whatsmeow_lid_map lm2 ON lm2.pn = replace(m.sender_jid, '@s.whatsapp.net', '')
    LEFT JOIN whatsmeow_contacts co_direct ON co_direct.their_jid = m.sender_jid AND co_direct.our_jid = $1
    LEFT JOIN whatsmeow_contacts co_via_lid ON co_via_lid.their_jid = lm.pn || '@s.whatsapp.net' AND co_via_lid.our_jid = $1
    LEFT JOIN whatsmeow_contacts co_via_pn ON co_via_pn.their_jid = lm2.lid || '@lid' AND co_via_pn.our_jid = $1
    WHERE m.our_jid = $1 AND m.chat_jid = $2 AND m.text IS NOT NULL
    ORDER BY m.ts ASC`,
  [ourJID, chatJID],
  )
  return result.rows.map((r) => {
    const cleaned = removeNull(r)
    if (cleaned.contact_name.endsWith('@s.whatsapp.net')) {
      cleaned.contact_name = formatPhoneNumber(cleaned.contact_name.split('@')[0])
    }
    return cleaned
  })
}

export function pickName(fullName: string, firstName: string, businessName: string): string {
  if (fullName) return fullName
  if (firstName) return firstName
  if (businessName) return businessName
  return ''
}

export function formatPhoneNumber(raw: string): string {
  if (!raw) return ''
  if (raw.startsWith('+')) return raw
  if (raw.startsWith('41') && raw.length === 11) {
    const national = raw.slice(2)
    return `+41 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5, 7)} ${national.slice(7, 9)}`
  }
  if (raw.length >= 3) return `+${raw.slice(0, 2)} ${raw.slice(2)}`
  return `+${raw}`
}

export function getChatName(row: ChatRow): string {
  const isGroup = row.chat_jid.endsWith('@g.us')
  if (isGroup) {
    if (row.group_name) return row.group_name
    return row.chat_jid
  }

  const directName = pickName(row.direct_full_name, row.direct_first_name, row.direct_business_name)
  if (directName) return directName

  const isLID = row.chat_jid.endsWith('@lid')
  const isPN = row.chat_jid.endsWith('@s.whatsapp.net')

  if (isLID) {
    if (row.lid_pn) {
      return formatPhoneNumber(row.lid_pn.replace('@s.whatsapp.net', ''))
    }
    const lidName = pickName(row.lid_full_name, row.lid_first_name, row.lid_business_name)
    if (lidName) return lidName
    return row.chat_jid
  }

  if (isPN) {
    const pnName = pickName(row.pn_full_name, row.pn_first_name, row.pn_business_name)
    if (pnName) return pnName
    return formatPhoneNumber(row.chat_jid.split('@')[0])
  }

  return row.chat_jid
}

export function formatSenderName(senderJID: string, fromMe: boolean, contactName: string): string {
  if (fromMe) return 'Me'
  if (contactName) return contactName
  if (senderJID.endsWith('@s.whatsapp.net')) return senderJID.split('@')[0]
  return senderJID
}
