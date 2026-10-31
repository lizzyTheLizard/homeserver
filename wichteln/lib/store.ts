import { randomBytes, randomUUID } from 'crypto'
import type { Queryable } from './db'
import { selectableWishOwners } from './matching'

export interface Wish {
  title: string
  description: string
}

export interface User {
  id: string
  name: string
  password: string
  wish: Wish | null
  /** id of the user whose wish this user has picked (phase 2) */
  selectedWishOf: string | null
}

export type Phase = 'wishes' | 'selection'

export interface Group {
  id: string
  name: string
  phase: Phase
  createdAt: string
  users: User[]
}

export interface UserRecord {
  group: Group
  user: User
}

export interface StoreSuccess<T> {
  ok: true
  value: T
}

export interface StoreFailure {
  ok: false
  error: string
}

export type StoreResult<T = undefined> = StoreSuccess<T> | StoreFailure

interface GroupRow {
  id: string
  name: string
  phase: string
  created_at: Date | string
}

interface UserRow {
  id: string
  group_id: string
  name: string
  password: string
  wish_title: string | null
  wish_description: string | null
  selected_wish_of: string | null
}

const USER_COLUMNS = 'id, group_id, name, password, wish_title, wish_description, selected_wish_of'

export async function listGroups(db: Queryable): Promise<Group[]> {
  const groups = await db.query<GroupRow>('SELECT id, name, phase, created_at FROM wichteln_groups ORDER BY created_at DESC')
  const users = await db.query<UserRow>(`SELECT ${USER_COLUMNS} FROM wichteln_users ORDER BY created_at, name`)
  const usersByGroup = new Map<string, UserRow[]>()

  for (const user of users) {
    const list = usersByGroup.get(user.group_id)
    if (list) list.push(user)
    else usersByGroup.set(user.group_id, [user])
  }

  return groups.map(group => mapGroup(group, usersByGroup.get(group.id) ?? []))
}

export async function getGroup(db: Queryable, groupId: string): Promise<Group | null> {
  const groups = await db.query<GroupRow>(
    'SELECT id, name, phase, created_at FROM wichteln_groups WHERE id = $1',
    [groupId],
  )
  const group = groups.at(0)
  if (!group) return null

  const users = await db.query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM wichteln_users WHERE group_id = $1 ORDER BY created_at, name`,
    [groupId],
  )
  return mapGroup(group, users)
}

export async function findUser(db: Queryable, groupId: string, userId: string): Promise<UserRecord | null> {
  const group = await getGroup(db, groupId)
  if (!group) return null

  const user = group.users.find(candidate => candidate.id === userId)
  return user ? { group, user } : null
}

export async function authenticateParticipant(
  db: Queryable,
  name: string,
  password: string,
): Promise<UserRecord | null> {
  const rows = await db.query<{ group_id: string, user_id: string }>(
    `
      SELECT g.id AS group_id, u.id AS user_id
      FROM wichteln_users u
      JOIN wichteln_groups g ON g.id = u.group_id
      WHERE lower(u.name) = lower($1) AND u.password = $2
      ORDER BY g.created_at, u.created_at
      LIMIT 1
    `,
    [name, password],
  )
  const row = rows.at(0)
  return row ? findUser(db, row.group_id, row.user_id) : null
}

export async function createGroup(db: Queryable, name: string, names: string[]): Promise<StoreResult<Group>> {
  if (!name) return { ok: false, error: 'Bitte einen Gruppennamen eingeben.' }
  if (names.length < 2) return { ok: false, error: 'Bitte mindestens zwei Teilnehmende eingeben.' }

  const duplicate = findDuplicateName(names)
  if (duplicate) return { ok: false, error: `Der Name „${duplicate}“ kommt mehrfach vor.` }

  const groupId = randomUUID()
  await db.query(
    'INSERT INTO wichteln_groups (id, name, phase) VALUES ($1, $2, $3)',
    [groupId, name, 'wishes'],
  )

  for (const participant of names) {
    await db.query(
      'INSERT INTO wichteln_users (id, group_id, name, password) VALUES ($1, $2, $3, $4)',
      [randomUUID(), groupId, participant, generatePassword()],
    )
  }

  const group = await getGroup(db, groupId)
  if (!group) return { ok: false, error: 'Gruppe konnte nicht erstellt werden.' }
  return { ok: true, value: group }
}

export async function addParticipants(
  db: Queryable,
  groupId: string,
  names: string[],
): Promise<StoreResult<number>> {
  if (names.length === 0) return { ok: false, error: 'Bitte mindestens einen Namen eingeben.' }

  const locked = await lockGroup(db, groupId)
  if (!locked) return { ok: false, error: 'Gruppe nicht gefunden.' }

  const group = await getGroup(db, groupId)
  if (!group) return { ok: false, error: 'Gruppe nicht gefunden.' }
  if (group.phase !== 'wishes') {
    return { ok: false, error: 'In Phase 2 können keine Teilnehmenden mehr hinzugefügt werden.' }
  }

  const duplicate = findDuplicateName([...group.users.map(user => user.name), ...names])
  if (duplicate) return { ok: false, error: `Der Name „${duplicate}“ ist bereits vorhanden.` }

  for (const participant of names) {
    await db.query(
      'INSERT INTO wichteln_users (id, group_id, name, password) VALUES ($1, $2, $3, $4)',
      [randomUUID(), groupId, participant, generatePassword()],
    )
  }
  return { ok: true, value: names.length }
}

export async function removeParticipant(db: Queryable, groupId: string, userId: string): Promise<void> {
  const locked = await lockGroup(db, groupId)
  if (!locked) return

  const group = await getGroup(db, groupId)
  if (group?.phase !== 'wishes') return

  await db.query('DELETE FROM wichteln_users WHERE id = $1 AND group_id = $2', [userId, groupId])
}

export async function deleteGroup(db: Queryable, groupId: string): Promise<void> {
  await db.query('DELETE FROM wichteln_groups WHERE id = $1', [groupId])
}

export async function startSelection(db: Queryable, groupId: string): Promise<StoreResult> {
  const locked = await lockGroup(db, groupId)
  if (!locked) return { ok: false, error: 'Gruppe nicht gefunden.' }

  const group = await getGroup(db, groupId)
  if (!group) return { ok: false, error: 'Gruppe nicht gefunden.' }
  if (group.phase !== 'wishes') return { ok: false, error: 'Die Auswahlphase läuft bereits.' }
  if (group.users.length < 2 || group.users.some(user => !user.wish)) {
    return { ok: false, error: 'Es fehlen noch Wünsche oder Teilnehmende.' }
  }

  await db.query('UPDATE wichteln_groups SET phase = $1 WHERE id = $2', ['selection', groupId])
  return { ok: true, value: undefined }
}

export async function saveWish(
  db: Queryable,
  groupId: string,
  userId: string,
  wish: Wish,
): Promise<StoreResult> {
  const locked = await lockGroup(db, groupId)
  if (!locked) return { ok: false, error: 'Benutzer nicht gefunden.' }

  const group = await getGroup(db, groupId)
  const user = group?.users.find(candidate => candidate.id === userId)
  if (!group || !user) return { ok: false, error: 'Benutzer nicht gefunden.' }
  if (group.phase !== 'wishes') return { ok: false, error: 'Wünsche können nicht mehr geändert werden.' }

  await db.query(
    'UPDATE wichteln_users SET wish_title = $1, wish_description = $2 WHERE id = $3',
    [wish.title, wish.description, userId],
  )
  return { ok: true, value: undefined }
}

export async function selectWish(
  db: Queryable,
  groupId: string,
  userId: string,
  ownerId: string,
): Promise<StoreResult> {
  const locked = await lockGroup(db, groupId)
  if (!locked) return { ok: false, error: 'Benutzer nicht gefunden.' }

  const group = await getGroup(db, groupId)
  const user = group?.users.find(candidate => candidate.id === userId)
  if (!group || !user) return { ok: false, error: 'Benutzer nicht gefunden.' }
  if (user.selectedWishOf) return { ok: false, error: 'Du hast bereits einen Wunsch gewählt.' }
  if (!selectableWishOwners(group, userId).includes(ownerId)) {
    return { ok: false, error: 'Dieser Wunsch ist nicht mehr verfügbar. Bitte wähle einen anderen.' }
  }

  try {
    await db.query('UPDATE wichteln_users SET selected_wish_of = $1 WHERE id = $2', [ownerId, userId])
  }
  catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: 'Dieser Wunsch ist nicht mehr verfügbar. Bitte wähle einen anderen.' }
    }
    throw error
  }
  return { ok: true, value: undefined }
}

async function lockGroup(db: Queryable, groupId: string): Promise<boolean> {
  const rows = await db.query<{ id: string }>(
    'SELECT id FROM wichteln_groups WHERE id = $1 FOR UPDATE',
    [groupId],
  )
  return rows.length > 0
}

function mapGroup(row: GroupRow, users: UserRow[]): Group {
  return {
    id: row.id,
    name: row.name,
    phase: row.phase as Phase,
    createdAt: toIso(row.created_at),
    users: users.map(mapUser),
  }
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    password: row.password,
    wish: row.wish_title !== null && row.wish_description !== null
      ? { title: row.wish_title, description: row.wish_description }
      : null,
    selectedWishOf: row.selected_wish_of,
  }
}

function findDuplicateName(names: string[]): string | null {
  const seen = new Set<string>()
  for (const name of names) {
    const key = name.toLowerCase()
    if (seen.has(key)) return name
    seen.add(key)
  }
  return null
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

// No ambiguous characters (0/O, 1/l/I)
const PW_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generatePassword(length = 8): string {
  const bytes = randomBytes(length)
  return Array.from(bytes, byte => PW_CHARS[byte % PW_CHARS.length]).join('')
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
}
