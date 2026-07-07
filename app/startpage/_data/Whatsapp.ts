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
