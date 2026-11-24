'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/session'
import * as store from '@/lib/store'
import { withTransaction } from '@/lib/db'
import type { FormState } from '../actions'
import { formString } from '@/lib/form'

export async function createGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const name = formString(formData, 'name').trim()
  if (!name) return { error: 'Bitte einen Gruppennamen eingeben.' }

  const result = await withTransaction(db => store.createGroup(db, name))
  if (!result.ok) return { error: result.error }

  revalidatePath('/admin')
  return redirect(`/admin/${result.value.id}`)
}

export async function resetPassword(accountId: string): Promise<FormState> {
  await requireAdmin()
  const result = await withTransaction(db => store.resetPassword(db, accountId))
  return result.ok ? { ok: result.value } : { error: result.error }
}

/** Assigns the account as owner of the group; an empty account clears the owner. */
export async function setOwner(groupId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const accountId = formString(formData, 'accountId')

  const result = await withTransaction(db => store.setGroupOwner(db, groupId, accountId || null))
  if (!result.ok) return { error: result.error }

  revalidatePath('/admin')
  revalidatePath(`/admin/${groupId}`)
  revalidatePath('/')
  return { ok: accountId ? 'Besitzer gespeichert.' : 'Besitzer entfernt.' }
}
