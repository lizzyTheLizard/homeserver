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
  const names = parseNames(formString(formData, 'names'))
  if (!name) return { error: 'Bitte einen Gruppennamen eingeben.' }
  if (names.length < 2) return { error: 'Bitte mindestens zwei Teilnehmende eingeben.' }

  const result = await withTransaction(db => store.createGroup(db, name, names))
  if (!result.ok) return { error: result.error }

  revalidatePath('/admin')
  redirect(`/admin/${result.value.id}`)
}

export async function addParticipants(groupId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const names = parseNames(formString(formData, 'names'))
  if (names.length === 0) return { error: 'Bitte mindestens einen Namen eingeben.' }

  const result = await withTransaction(db => store.addParticipants(db, groupId, names))
  revalidatePath(`/admin/${groupId}`)
  return result.ok
    ? { ok: `${String(result.value)} Teilnehmende hinzugefügt.` }
    : { error: result.error }
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

function parseNames(raw: string) {
  return raw
    .split(/[\n,;]/)
    .map(name => name.trim())
    .filter(Boolean)
}
