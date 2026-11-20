import { hashPassword, verifyPassword } from './password'
import { randomBytes, randomUUID } from 'crypto'
import { NAME_TAKEN } from './registration'
import type { Queryable } from './db'
import { createInviteToken } from './inviteToken'
import { selectableWishOwners } from './matching'

export interface Wish {
  title: string
  description: string
}

/** A participant: the membership of an account in one group. `id` is the participant id. */
export interface User {
  id: string
  accountId: string
  name: string
  wish: Wish | null
  /** Id of the user whose wish this user has picked (phase 2) */
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

export interface Account {
  id: string
  name: string
  mustChangePassword: boolean
}

/** An account as the administrator sees it: its name and the names of its groups. */
export interface AccountSummary {
  id: string
  name: string
  groups: string[]
}

export interface GroupSummary {
  id: string
  name: string
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
  account_id: string
  name: string
  wish_title: string | null
  wish_description: string | null
  selected_wish_of: string | null
}

const GROUP_COLUMNS = 'id, name, phase, invite_token, created_at',
 USER_COLUMNS = 'p.id, p.group_id, p.account_id, a.name, p.wish_title, p.wish_description, p.selected_wish_of',
 USER_FROM = 'wichteln_participants p JOIN wichteln_accounts a ON a.id = p.account_id',
 USER_ORDER = 'p.created_at, a.name',
 JOIN_CLOSED = 'Die Auswahlphase läuft bereits. Ein Beitritt ist nicht mehr möglich.'

export async function listGroups(db: Queryable): Promise<Group[]> {
  const groups = await db.query<GroupRow>(`SELECT ${GROUP_COLUMNS} FROM wichteln_groups ORDER BY created_at DESC`),
   users = await db.query<UserRow>(`SELECT ${USER_COLUMNS} FROM ${USER_FROM} ORDER BY ${USER_ORDER}`),
   usersByGroup = new Map<string, UserRow[]>()

  for (const user of users) {
    const list = usersByGroup.get(user.group_id)
    if (list) {list.push(user)}
    else {usersByGroup.set(user.group_id, [user])}
  }

  return groups.map(group => mapGroup(group, usersByGroup.get(group.id) ?? []))
}

export async function getGroup(db: Queryable, groupId: string): Promise<Group | null> {
  const groups = await db.query<GroupRow>(`SELECT ${GROUP_COLUMNS} FROM wichteln_groups WHERE id = $1`, [groupId]),
   group = groups.at(0)
  return group ? loadGroup(db, group) : null
}

export async function getGroupByInviteToken(db: Queryable, token: string): Promise<Group | null> {
  if (!token) {return null}
  const groups = await db.query<GroupRow>(`SELECT ${GROUP_COLUMNS} FROM wichteln_groups WHERE invite_token = $1`, [token]),
   group = groups.at(0)
  return group ? loadGroup(db, group) : null
}

export async function getAccount(db: Queryable, accountId: string): Promise<Account | null> {
  const rows = await db.query<{ id: string, name: string, must_change_password: boolean }>(
    'SELECT id, name, must_change_password FROM wichteln_accounts WHERE id = $1',
    [accountId],
  ),
   row = rows.at(0)
  return row ? { id: row.id, mustChangePassword: row.must_change_password, name: row.name } : null
}

/** The account's participation in a group, or `null` if it is not a member. */
export async function findParticipant(db: Queryable, groupId: string, accountId: string): Promise<UserRecord | null> {
  const group = await getGroup(db, groupId)
  if (!group) {return null}

  const user = group.users.find(candidate => candidate.accountId === accountId)
  return user ? { group, user } : null
}

/** Groups the account is a member of, ordered by name. */
export async function listAccountGroups(db: Queryable, accountId: string): Promise<GroupSummary[]> {
  return db.query<GroupSummary>(
    `SELECT g.id, g.name FROM wichteln_groups g JOIN wichteln_participants p ON p.group_id = g.id
     WHERE p.account_id = $1 ORDER BY lower(g.name), g.created_at`,
    [accountId],
  )
}

/** Every account with the names of its groups, ordered by name ignoring case. */
export async function listAccounts(db: Queryable): Promise<AccountSummary[]> {
  return db.query<AccountSummary>(
    `SELECT a.id, a.name, array_remove(array_agg(g.name ORDER BY lower(g.name), g.created_at), NULL) AS groups
     FROM wichteln_accounts a
     LEFT JOIN wichteln_participants p ON p.account_id = a.id
     LEFT JOIN wichteln_groups g ON g.id = p.group_id
     GROUP BY a.id, a.name
     ORDER BY lower(a.name), a.created_at`,
  )
}

/**
 * Signs an account in by name and password. Unknown names still pay for a hash
 * check so the response time does not reveal which names exist.
 */
export async function authenticateAccount(db: Queryable, name: string, password: string): Promise<Account | null> {
  const rows = await db.query<{ id: string, password_hash: string }>(
    'SELECT id, password_hash FROM wichteln_accounts WHERE lower(name) = lower($1)',
    [name],
  ),
   row = rows.at(0)
  if (!row) {
    await verifyPassword(password, await dummyHash())
    return null
  }
  if (!await verifyPassword(password, row.password_hash)) {return null}
  return getAccount(db, row.id)
}

export async function createGroup(db: Queryable, name: string): Promise<StoreResult<Group>> {
  if (!name) {return { error: 'Bitte einen Gruppennamen eingeben.', ok: false }}

  const groupId = randomUUID()
  await db.query(
    'INSERT INTO wichteln_groups (id, name, phase, invite_token) VALUES ($1, $2, $3, $4)',
    [groupId, name, 'wishes', createInviteToken(name)],
  )

  const group = await getGroup(db, groupId)
  if (!group) {return { error: 'Gruppe konnte nicht erstellt werden.', ok: false }}
  return { ok: true, value: group }
}

/**
 * Creates an account and makes it a participant of the group, both or nothing.
 * `passwordHash` comes from `hashPassword`. Run inside a transaction.
 */
export async function registerAccount(
  db: Queryable,
  groupId: string,
  name: string,
  passwordHash: string,
): Promise<StoreResult<Account>> {
  const locked = await lockGroup(db, groupId)
  if (!locked) {return { error: 'Gruppe nicht gefunden.', ok: false }}

  const group = await getGroup(db, groupId)
  if (!group) {return { error: 'Gruppe nicht gefunden.', ok: false }}
  if (group.phase !== 'wishes') {
    return { error: 'Die Auswahlphase läuft bereits. Eine Registrierung ist nicht mehr möglich.', ok: false }
  }

  const existing = await db.query<{ id: string }>('SELECT id FROM wichteln_accounts WHERE lower(name) = lower($1)', [name])
  if (existing.length > 0) {return { error: NAME_TAKEN, ok: false }}

  const accountId = randomUUID()
  try {
    await db.query(
      'INSERT INTO wichteln_accounts (id, name, password_hash) VALUES ($1, $2, $3)',
      [accountId, name, passwordHash],
    )
  }
  catch (error) {
    if (isUniqueViolation(error)) {return { error: NAME_TAKEN, ok: false }}
    throw error
  }
  await db.query(
    'INSERT INTO wichteln_participants (id, group_id, account_id) VALUES ($1, $2, $3)',
    [randomUUID(), groupId, accountId],
  )
  return { ok: true, value: { id: accountId, mustChangePassword: false, name } }
}

/** Adds the account to the group during the wish phase; joining twice changes nothing. */
export async function joinGroup(db: Queryable, groupId: string, accountId: string): Promise<StoreResult> {
  const locked = await lockGroup(db, groupId)
  if (!locked) {return { error: 'Gruppe nicht gefunden.', ok: false }}

  const group = await getGroup(db, groupId)
  if (!group) {return { error: 'Gruppe nicht gefunden.', ok: false }}
  if (group.users.some(user => user.accountId === accountId)) {return { ok: true, value: undefined }}
  if (group.phase !== 'wishes') {return { error: JOIN_CLOSED, ok: false }}

  await db.query(
    'INSERT INTO wichteln_participants (id, group_id, account_id) VALUES ($1, $2, $3) ON CONFLICT (group_id, account_id) DO NOTHING',
    [randomUUID(), groupId, accountId],
  )
  return { ok: true, value: undefined }
}

/** Sets a self-chosen password and ends a pending forced change. `passwordHash` comes from `hashPassword`. */
export async function changePassword(db: Queryable, accountId: string, passwordHash: string): Promise<StoreResult> {
  const rows = await db.query<{ id: string }>(
    'UPDATE wichteln_accounts SET password_hash = $1, must_change_password = FALSE WHERE id = $2 RETURNING id',
    [passwordHash, accountId],
  )
  if (rows.length === 0) {return { error: 'Konto nicht gefunden.', ok: false }}
  return { ok: true, value: undefined }
}

/**
 * Replaces the account's password with a generated one, forces a change on the
 * next sign-in and returns the password in plain text, once.
 */
export async function resetPassword(db: Queryable, accountId: string): Promise<StoreResult<string>> {
  const password = generatePassword(),
   rows = await db.query<{ id: string }>(
    'UPDATE wichteln_accounts SET password_hash = $1, must_change_password = TRUE WHERE id = $2 RETURNING id',
    [await hashPassword(password), accountId],
  )
  if (rows.length === 0) {return { error: 'Konto nicht gefunden.', ok: false }}
  return { ok: true, value: password }
}

export async function removeParticipant(db: Queryable, groupId: string, userId: string): Promise<void> {
  const locked = await lockGroup(db, groupId)
  if (!locked) {return}

  const group = await getGroup(db, groupId)
  if (group?.phase !== 'wishes') {return}

  await db.query('DELETE FROM wichteln_participants WHERE id = $1 AND group_id = $2', [userId, groupId])
}

export async function deleteGroup(db: Queryable, groupId: string): Promise<void> {
  await db.query('DELETE FROM wichteln_groups WHERE id = $1', [groupId])
}

export async function startSelection(db: Queryable, groupId: string): Promise<StoreResult> {
  const locked = await lockGroup(db, groupId)
  if (!locked) {return { error: 'Gruppe nicht gefunden.', ok: false }}

  const group = await getGroup(db, groupId)
  if (!group) {return { error: 'Gruppe nicht gefunden.', ok: false }}
  if (group.phase !== 'wishes') {return { error: 'Die Auswahlphase läuft bereits.', ok: false }}
  if (group.users.length < 2 || group.users.some(user => !user.wish)) {
    return { error: 'Es fehlen noch Wünsche oder Teilnehmende.', ok: false }
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
  if (!locked) {return { error: 'Benutzer nicht gefunden.', ok: false }}

  const group = await getGroup(db, groupId),
   user = group?.users.find(candidate => candidate.id === userId)
  if (!group || !user) {return { error: 'Benutzer nicht gefunden.', ok: false }}
  if (group.phase !== 'wishes') {return { error: 'Wünsche können nicht mehr geändert werden.', ok: false }}

  await db.query(
    'UPDATE wichteln_participants SET wish_title = $1, wish_description = $2 WHERE id = $3',
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
  if (!locked) {return { error: 'Benutzer nicht gefunden.', ok: false }}

  const group = await getGroup(db, groupId),
   user = group?.users.find(candidate => candidate.id === userId)
  if (!group || !user) {return { error: 'Benutzer nicht gefunden.', ok: false }}
  if (user.selectedWishOf) {return { error: 'Du hast bereits einen Wunsch gewählt.', ok: false }}
  if (!selectableWishOwners(group, userId).includes(ownerId)) {
    return { error: 'Dieser Wunsch ist nicht mehr verfügbar. Bitte wähle einen anderen.', ok: false }
  }

  try {
    await db.query('UPDATE wichteln_participants SET selected_wish_of = $1 WHERE id = $2', [ownerId, userId])
  }
  catch (error) {
    if (isUniqueViolation(error)) {
      return { error: 'Dieser Wunsch ist nicht mehr verfügbar. Bitte wähle einen anderen.', ok: false }
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
    `SELECT ${USER_COLUMNS} FROM ${USER_FROM} WHERE p.group_id = $1 ORDER BY ${USER_ORDER}`,
    [group.id],
  )
  return mapGroup(group, users)
}

function mapGroup(row: GroupRow, users: UserRow[]): Group {
  return {
    createdAt: toIso(row.created_at),
    id: row.id,
    inviteToken: row.invite_token,
    name: row.name,
    phase: row.phase as Phase,
    users: users.map(mapUser),
  }
}

function mapUser(row: UserRow): User {
  return {
    accountId: row.account_id,
    id: row.id,
    name: row.name,
    selectedWishOf: row.selected_wish_of,
    wish: row.wish_title !== null && row.wish_description !== null
      ? { description: row.wish_description, title: row.wish_title }
      : null,
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
