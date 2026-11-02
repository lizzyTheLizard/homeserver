import { randomBytes, randomUUID } from 'crypto'
import type { Queryable } from './db'
import { selectableWishOwners } from './matching'
import { createInviteToken } from './inviteToken'
import { hashPassword, verifyPassword } from './password'

export interface Wish {
  title: string
  description: string
}

export interface User {
  id: string
  name: string
  wish: Wish | null
  /** id of the user whose wish this user has picked (phase 2) */
  selectedWishOf: string | null
}

export type Phase = 'wishes' | 'selection'

export interface Group {
  id: string
  name: string
  phase: Phase
  inviteToken: string
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
  invite_token: string
  created_at: Date | string
}

interface UserRow {
  id: string
  group_id: string
  name: string
  wish_title: string | null
  wish_description: string | null
  selected_wish_of: string | null
}

const GROUP_COLUMNS = 'id, name, phase, invite_token, created_at'
const USER_COLUMNS = 'id, group_id, name, wish_title, wish_description, selected_wish_of'
const NAME_TAKEN = 'Dieser Name ist in der Gruppe bereits vergeben.'

export async function listGroups(db: Queryable): Promise<Group[]> {
  const groups = await db.query<GroupRow>(`SELECT ${GROUP_COLUMNS} FROM wichteln_groups ORDER BY created_at DESC`)
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
  const groups = await db.query<GroupRow>(`SELECT ${GROUP_COLUMNS} FROM wichteln_groups WHERE id = $1`, [groupId])
  const group = groups.at(0)
  return group ? loadGroup(db, group) : null
}

export async function getGroupByInviteToken(db: Queryable, token: string): Promise<Group | null> {
  if (!token) return null
  const groups = await db.query<GroupRow>(`SELECT ${GROUP_COLUMNS} FROM wichteln_groups WHERE invite_token = $1`, [token])
  const group = groups.at(0)
  return group ? loadGroup(db, group) : null
}

export async function findUser(db: Queryable, groupId: string, userId: string): Promise<UserRecord | null> {
  const group = await getGroup(db, groupId)
  if (!group) return null

  const user = group.users.find(candidate => candidate.id === userId)
  return user ? { group, user } : null
}

/**
 * Signs a participant in within one group. Unknown names still pay for a hash
 * check so the response time does not reveal which names exist.
 */
export async function authenticateParticipant(
  db: Queryable,
  groupId: string,
  name: string,
  password: string,
): Promise<UserRecord | null> {
  const rows = await db.query<{ id: string, password_hash: string }>(
    'SELECT id, password_hash FROM wichteln_users WHERE group_id = $1 AND lower(name) = lower($2)',
    [groupId, name],
  )
  const row = rows.at(0)
  if (!row) {
    await verifyPassword(password, await dummyHash())
    return null
  }
  if (!await verifyPassword(password, row.password_hash)) return null
  return findUser(db, groupId, row.id)
}

export async function createGroup(db: Queryable, name: string): Promise<StoreResult<Group>> {
  if (!name) return { ok: false, error: 'Bitte einen Gruppennamen eingeben.' }

  const groupId = randomUUID()
  await db.query(
    'INSERT INTO wichteln_groups (id, name, phase, invite_token) VALUES ($1, $2, $3, $4)',
    [groupId, name, 'wishes', createInviteToken(name)],
  )

  const group = await getGroup(db, groupId)
  if (!group) return { ok: false, error: 'Gruppe konnte nicht erstellt werden.' }
  return { ok: true, value: group }
}

/** Adds a self-registered participant; `passwordHash` comes from `hashPassword`. */
export async function registerParticipant(
  db: Queryable,
  groupId: string,
  name: string,
  passwordHash: string,
): Promise<StoreResult<User>> {
  const locked = await lockGroup(db, groupId)
  if (!locked) return { ok: false, error: 'Gruppe nicht gefunden.' }

  const group = await getGroup(db, groupId)
  if (!group) return { ok: false, error: 'Gruppe nicht gefunden.' }
  if (group.phase !== 'wishes') {
    return { ok: false, error: 'Die Auswahlphase läuft bereits. Eine Registrierung ist nicht mehr möglich.' }
  }
  if (group.users.some(user => user.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: NAME_TAKEN }
  }

  const userId = randomUUID()
  try {
    await db.query(
      'INSERT INTO wichteln_users (id, group_id, name, password_hash) VALUES ($1, $2, $3, $4)',
      [userId, groupId, name, passwordHash],
    )
  }
  catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: NAME_TAKEN }
    throw error
  }
  return { ok: true, value: { id: userId, name, wish: null, selectedWishOf: null } }
}

/** Replaces a participant's password with a generated one and returns it in plain text, once. */
export async function resetPassword(db: Queryable, groupId: string, userId: string): Promise<StoreResult<string>> {
  const password = generatePassword()
  const rows = await db.query<{ id: string }>(
    'UPDATE wichteln_users SET password_hash = $1 WHERE id = $2 AND group_id = $3 RETURNING id',
    [await hashPassword(password), userId, groupId],
  )
  if (rows.length === 0) return { ok: false, error: 'Teilnehmer:in nicht gefunden.' }
  return { ok: true, value: password }
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

async function loadGroup(db: Queryable, group: GroupRow): Promise<Group> {
  const users = await db.query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM wichteln_users WHERE group_id = $1 ORDER BY created_at, name`,
    [group.id],
  )
  return mapGroup(group, users)
}

function mapGroup(row: GroupRow, users: UserRow[]): Group {
  return {
    id: row.id,
    name: row.name,
    phase: row.phase as Phase,
    inviteToken: row.invite_token,
    createdAt: toIso(row.created_at),
    users: users.map(mapUser),
  }
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    wish: row.wish_title !== null && row.wish_description !== null
      ? { title: row.wish_title, description: row.wish_description }
      : null,
    selectedWishOf: row.selected_wish_of,
  }
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

// No ambiguous characters (0/O, 1/l/I)
const PW_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generatePassword(length = 10): string {
  const bytes = randomBytes(length)
  return Array.from(bytes, byte => PW_CHARS[byte % PW_CHARS.length]).join('')
}

let dummy: Promise<string> | undefined

function dummyHash(): Promise<string> {
  dummy ??= hashPassword(randomBytes(16).toString('hex'))
  return dummy
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
}
