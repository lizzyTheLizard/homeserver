'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { adminCredentials, clearSession, getSession, setSession } from '@/lib/session'
import { findUser, getDb, updateDb } from '@/lib/store'
import { selectableWishOwners } from '@/lib/matching'
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

  const db = await getDb()
  for (const group of db.groups) {
    const user = group.users.find(
      u => u.name.toLowerCase() === username.toLowerCase() && u.password === password,
    )
    if (user) {
      await setSession({ role: 'user', groupId: group.id, userId: user.id })
      redirect('/wunsch')
    }
  }
  return { error: 'Benutzername oder Passwort ist falsch.' }
}

export async function logout() {
  await clearSession()
  redirect('/')
}

async function currentUserSession() {
  const s = await getSession()
  if (s?.role !== 'user') redirect('/')
  return s
}

export async function saveWish(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await currentUserSession()
  const title = formString(formData, 'title').trim()
  const description = formString(formData, 'description').trim()
  if (!title || !description) return { error: 'Bitte Titel und Beschreibung ausfüllen.' }
  if (title.length > 120) return { error: 'Der Titel ist zu lang (max. 120 Zeichen).' }
  if (description.length > 2000) return { error: 'Die Beschreibung ist zu lang (max. 2000 Zeichen).' }

  const result = await updateDb((db): FormState => {
    const found = findUser(db, s.groupId, s.userId)
    if (!found) return { error: 'Benutzer nicht gefunden.' }
    if (found.group.phase !== 'wishes') return { error: 'Wünsche können nicht mehr geändert werden.' }
    found.user.wish = { title, description }
    return { ok: 'Dein Wunsch wurde gespeichert.' }
  })
  revalidatePath('/', 'layout')
  return result
}

export async function selectWish(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await currentUserSession()
  const ownerId = formString(formData, 'ownerId')

  const result = await updateDb((db): FormState => {
    const found = findUser(db, s.groupId, s.userId)
    if (!found) return { error: 'Benutzer nicht gefunden.' }
    if (found.user.selectedWishOf) return { error: 'Du hast bereits einen Wunsch gewählt.' }
    if (!selectableWishOwners(found.group, s.userId).includes(ownerId)) {
      return { error: 'Dieser Wunsch ist nicht mehr verfügbar. Bitte wähle einen anderen.' }
    }
    found.user.selectedWishOf = ownerId
    return { ok: 'Wunsch gewählt.' }
  })
  revalidatePath('/', 'layout')
  return result
}
