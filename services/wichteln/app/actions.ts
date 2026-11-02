'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { adminCredentials, clearSession, getSession, setSession } from '@/lib/session'
import * as store from '@/lib/store'
import { getDb, withTransaction } from '@/lib/db'
import { formString } from '@/lib/form'
import { hashPassword } from '@/lib/password'
import { registrationError } from '@/lib/registration'

export type FormState = { error?: string, ok?: string } | undefined

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = formString(formData, 'username').trim()
  const password = formString(formData, 'password')
  if (!username || !password) return { error: 'Bitte Benutzername und Passwort eingeben.' }

  const admin = adminCredentials()
  if (username === admin.user && password === admin.password) {
    await setSession({ role: 'admin' })
    redirect('/admin')
  }
  return {
    error: 'Benutzername oder Passwort ist falsch. Teilnehmende melden sich über den Einladungslink an, den sie erhalten haben.',
  }
}

export async function groupLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = formString(formData, 'name').trim()
  const password = formString(formData, 'password')
  if (!name || !password) return { error: 'Bitte Name und Passwort eingeben.' }

  const db = await getDb()
  const group = await store.getGroupByInviteToken(db, formString(formData, 'token'))
  if (!group) return { error: 'Diese Gruppe gibt es nicht.' }

  const found = await store.authenticateParticipant(db, group.id, name, password)
  if (!found) return { error: 'Name oder Passwort ist falsch.' }

  await setSession({ role: 'user', groupId: group.id, userId: found.user.id })
  redirect('/wunsch')
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = formString(formData, 'name').trim()
  const password = formString(formData, 'password')
  const invalid = registrationError(name, password, formString(formData, 'passwordConfirmation'))
  if (invalid) return { error: invalid }

  const group = await store.getGroupByInviteToken(await getDb(), formString(formData, 'token'))
  if (!group) return { error: 'Diese Gruppe gibt es nicht.' }

  // Hash outside the transaction so the group lock is not held during scrypt.
  const passwordHash = await hashPassword(password)
  const result = await withTransaction(db => store.registerParticipant(db, group.id, name, passwordHash))
  if (!result.ok) return { error: result.error }

  await setSession({ role: 'user', groupId: group.id, userId: result.value.id })
  revalidatePath('/', 'layout')
  redirect('/wunsch')
}

export async function logout() {
  const s = await getSession()
  await clearSession()
  if (s?.role === 'user') {
    const group = await store.getGroup(await getDb(), s.groupId)
    if (group) redirect(`/g/${group.inviteToken}`)
  }
  redirect('/')
}

export async function saveWish(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await currentUserSession()
  const title = formString(formData, 'title').trim()
  const description = formString(formData, 'description').trim()
  if (!title || !description) return { error: 'Bitte Titel und Beschreibung ausfüllen.' }
  if (title.length > 120) return { error: 'Der Titel ist zu lang (max. 120 Zeichen).' }
  if (description.length > 2000) return { error: 'Die Beschreibung ist zu lang (max. 2000 Zeichen).' }

  const result = await withTransaction(db => store.saveWish(db, s.groupId, s.userId, { title, description }))
  revalidatePath('/', 'layout')
  return result.ok ? { ok: 'Dein Wunsch wurde gespeichert.' } : { error: result.error }
}

export async function selectWish(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await currentUserSession()
  const ownerId = formString(formData, 'ownerId')

  const result = await withTransaction(db => store.selectWish(db, s.groupId, s.userId, ownerId))
  revalidatePath('/', 'layout')
  return result.ok ? { ok: 'Wunsch gewählt.' } : { error: result.error }
}

async function currentUserSession() {
  const s = await getSession()
  if (s?.role !== 'user') redirect('/')
  return s
}
