'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { adminCredentials, clearSession, requireAccount, requireParticipant, setSession } from '@/lib/session'
import * as store from '@/lib/store'
import { getDb, withTransaction } from '@/lib/db'
import { formString } from '@/lib/form'
import { hashPassword } from '@/lib/password'
import { passwordError, registrationError } from '@/lib/registration'
import { safeContinuePath } from '@/lib/continuePath'

export type FormState = { error?: string, ok?: string } | undefined

/** Start page sign-in for the administrator and for participant accounts. */
export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = formString(formData, 'username').trim()
  const password = formString(formData, 'password')
  if (!username || !password) return { error: 'Bitte Name und Passwort eingeben.' }

  const admin = adminCredentials()
  if (username === admin.user && password === admin.password) {
    await setSession({ role: 'admin' })
    redirect('/admin')
  }

  const account = await store.authenticateAccount(await getDb(), username, password)
  if (!account) return { error: 'Name oder Passwort ist falsch.' }

  await setSession({ role: 'user', accountId: account.id })
  redirect('/')
}

/** Invite page sign-in; the invite page then joins the group or explains why not. */
export async function groupLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = formString(formData, 'name').trim()
  const password = formString(formData, 'password')
  if (!name || !password) return { error: 'Bitte Name und Passwort eingeben.' }

  const db = await getDb()
  const group = await store.getGroupByInviteToken(db, formString(formData, 'token'))
  if (!group) return { error: 'Diese Gruppe gibt es nicht.' }

  const account = await store.authenticateAccount(db, name, password)
  if (!account) return { error: 'Name oder Passwort ist falsch.' }

  await setSession({ role: 'user', accountId: account.id })
  redirect(`/g/${group.inviteToken}`)
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = formString(formData, 'name').trim()
  const password = formString(formData, 'password')
  const invalid = registrationError(name, password, formString(formData, 'passwordConfirmation'), adminCredentials().user)
  if (invalid) return { error: invalid }

  const group = await store.getGroupByInviteToken(await getDb(), formString(formData, 'token'))
  if (!group) return { error: 'Diese Gruppe gibt es nicht.' }

  // Hash outside the transaction so the group lock is not held during scrypt.
  const passwordHash = await hashPassword(password)
  const result = await withTransaction(db => store.registerAccount(db, group.id, name, passwordHash))
  if (!result.ok) return { error: result.error }

  await setSession({ role: 'user', accountId: result.value.id })
  revalidatePath('/', 'layout')
  redirect(`/gruppen/${group.id}`)
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const account = await requireAccount({ allowPendingChange: true })
  const password = formString(formData, 'password')
  const invalid = passwordError(password, formString(formData, 'passwordConfirmation'))
  if (invalid) return { error: invalid }

  const result = await store.changePassword(await getDb(), account.id, await hashPassword(password))
  if (!result.ok) return { error: result.error }

  if (account.mustChangePassword) redirect(safeContinuePath(formString(formData, 'weiter')))
  return { ok: 'Dein Passwort wurde geändert.' }
}

export async function logout() {
  await clearSession()
  redirect('/')
}

export async function saveWish(_prev: FormState, formData: FormData): Promise<FormState> {
  const { group, user } = await requireParticipant(formString(formData, 'groupId'))
  const title = formString(formData, 'title').trim()
  const description = formString(formData, 'description').trim()
  if (!title || !description) return { error: 'Bitte Titel und Beschreibung ausfüllen.' }
  if (title.length > 120) return { error: 'Der Titel ist zu lang (max. 120 Zeichen).' }
  if (description.length > 2000) return { error: 'Die Beschreibung ist zu lang (max. 2000 Zeichen).' }

  const result = await withTransaction(db => store.saveWish(db, group.id, user.id, { title, description }))
  revalidatePath('/', 'layout')
  return result.ok ? { ok: 'Dein Wunsch wurde gespeichert.' } : { error: result.error }
}

export async function selectWish(_prev: FormState, formData: FormData): Promise<FormState> {
  const { group, user } = await requireParticipant(formString(formData, 'groupId'))
  const ownerId = formString(formData, 'ownerId')

  const result = await withTransaction(db => store.selectWish(db, group.id, user.id, ownerId))
  revalidatePath('/', 'layout')
  return result.ok ? { ok: 'Wunsch gewählt.' } : { error: result.error }
}
