'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { adminCredentials, clearSession, getSession, setSession } from '@/lib/session'
import * as store from '@/lib/store'
import { getDb, withTransaction } from '@/lib/db'
import { formString } from '@/lib/form'

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

  const found = await store.authenticateParticipant(await getDb(), username, password)
  if (found) {
    await setSession({ role: 'user', groupId: found.group.id, userId: found.user.id })
    redirect('/wunsch')
  }
  return { error: 'Benutzername oder Passwort ist falsch.' }
}

export async function logout() {
  await clearSession()
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
