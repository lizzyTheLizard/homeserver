import 'server-only'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface Wish { title: string, description: string }

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

export interface Db { groups: Group[] }

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

// Serialize all writes so concurrent requests can't clobber each other.
const g = globalThis as unknown as { __wichtelLock?: Promise<unknown> }

async function readDb(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, 'utf8')) as Db
  }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { groups: [] }
    throw e
  }
}

async function writeDb(db: Db) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const tmp = `${DB_FILE}.${String(process.pid)}.${String(Date.now())}.tmp`
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8')
  await fs.rename(tmp, DB_FILE)
}

export async function getDb(): Promise<Db> {
  await g.__wichtelLock
  return readDb()
}

/** Runs `fn` exclusively on the current db; the db is saved afterwards. */
export function updateDb<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = (g.__wichtelLock ?? Promise.resolve()).then(async () => {
    const db = await readDb()
    const result = await fn(db)
    await writeDb(db)
    return result
  })
  g.__wichtelLock = run.catch(() => undefined)
  return run
}

export function newId() {
  return crypto.randomUUID()
}

// No ambiguous characters (0/O, 1/l/I)
const PW_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generatePassword(length = 8) {
  const bytes = crypto.randomBytes(length)
  return Array.from(bytes, b => PW_CHARS[b % PW_CHARS.length]).join('')
}

export function findUser(db: Db, groupId: string, userId: string) {
  const group = db.groups.find(gr => gr.id === groupId)
  const user = group?.users.find(u => u.id === userId)
  return group && user ? { group, user } : null
}
