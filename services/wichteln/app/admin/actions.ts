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
  redirect(`/admin/${result.value.id}`)
}

export async function resetPassword(groupId: string, userId: string): Promise<FormState> {
  await requireAdmin()
  const result = await withTransaction(db => store.resetPassword(db, groupId, userId))
  return result.ok ? { ok: result.value } : { error: result.error }
}

export async function removeParticipant(groupId: string, userId: string) {
  await requireAdmin()
  await withTransaction(db => store.removeParticipant(db, groupId, userId))
  revalidatePath(`/admin/${groupId}`)
}

export async function startSelection(groupId: string) {
  await requireAdmin()
  await withTransaction(db => store.startSelection(db, groupId))
  revalidatePath(`/admin/${groupId}`)
}

export async function deleteGroup(groupId: string) {
  await requireAdmin()
  await withTransaction(db => store.deleteGroup(db, groupId))
  revalidatePath('/admin')
  redirect('/admin')
}
