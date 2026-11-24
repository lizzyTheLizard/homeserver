'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAccount, requireGroupManager } from '@/lib/session'
import * as store from '@/lib/store'
import { withTransaction } from '@/lib/db'
import { formString } from '@/lib/form'
import type { FormState } from '../actions'

const JOIN_CLOSED = 'Die Auswahlphase läuft bereits. Du kannst dich nicht mehr hinzufügen oder entfernen.'

/** A participant creates a group and becomes its owner. */
export async function createOwnedGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const account = await requireAccount()
  const name = formString(formData, 'name').trim()
  if (!name) return { error: 'Bitte einen Gruppennamen eingeben.' }

  const result = await withTransaction(db => store.createGroup(db, name, account.id))
  if (!result.ok) return { error: result.error }

  revalidatePath('/')
  return redirect(`/verwaltung/${result.value.id}`)
}

export async function removeParticipant(groupId: string, participantId: string) {
  await requireGroupManager(groupId)
  await withTransaction(db => store.removeParticipant(db, groupId, participantId))
  revalidateGroup(groupId)
}

export async function startSelection(groupId: string) {
  await requireGroupManager(groupId)
  await withTransaction(db => store.startSelection(db, groupId))
  revalidateGroup(groupId)
}

export async function deleteGroup(groupId: string) {
  const { role } = await requireGroupManager(groupId)
  await withTransaction(db => store.deleteGroup(db, groupId))
  revalidatePath('/', 'layout')
  redirect(role === 'admin' ? '/admin' : '/')
}

/** The owner adds their own account to the group as a participant (wish phase only). */
export async function joinOwnGroup(groupId: string): Promise<FormState> {
  const { role, account } = await requireGroupManager(groupId)
  if (role !== 'owner' || !account) return { error: 'Nur die Besitzerin oder der Besitzer kann sich selbst hinzufügen.' }

  const result = await withTransaction(db => store.joinGroup(db, groupId, account.id))
  revalidateGroup(groupId)
  return result.ok ? { ok: 'Du nimmst jetzt an der Gruppe teil.' } : { error: result.error }
}

/** The owner removes their own participation, and thereby their wish, from the group (wish phase only). */
export async function leaveOwnGroup(groupId: string): Promise<FormState> {
  const { role, account } = await requireGroupManager(groupId)
  if (role !== 'owner' || !account) return { error: 'Nur die Besitzerin oder der Besitzer kann sich selbst entfernen.' }

  const outcome = await withTransaction(async db => {
    const found = await store.findParticipant(db, groupId, account.id)
    if (found?.group.phase !== 'wishes') return found ? JOIN_CLOSED : undefined

    await store.removeParticipant(db, groupId, found.user.id)
    return undefined
  })
  revalidateGroup(groupId)
  return outcome ? { error: outcome } : { ok: 'Du nimmst nicht mehr an der Gruppe teil.' }
}

function revalidateGroup(groupId: string) {
  revalidatePath(`/admin/${groupId}`)
  revalidatePath(`/verwaltung/${groupId}`)
  revalidatePath('/')
}
