'use server'
import { type ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse';
import { type Favorite, type FavoriteInput, createOrModifyFavorite, findFavoritesByOwner, removeFavorite } from '@/app/startpage/_data/Favorite';
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { validateObject, validateString } from '@/app/shared/_helper/validation'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { logEvent } from '@/app/shared/_data/Event'
import { z } from 'zod'

export async function loadFavorites(): Promise<Favorite[]> {
  const user = await getAuthenticatedUserSession('startpage')
  return nontransactional(c => findFavoritesByOwner(c, user.email))
}

export async function saveFavorite(input: FavoriteInput): ActionResponse<Favorite> {
  return toResponse(transactional(async (tx) => {
    const user = await getAuthenticatedUserSession('startpage')
    validateObject(input, FavoriteInputSchema)
    const result = await createOrModifyFavorite(tx, user.email, input)
    await logEvent(tx, 'INFO', `Saved favorite ${input.name}`)
    return result
  }))
}

export async function deleteFavorite(id: string): ActionResponse<Favorite | undefined> {
  return toResponse(transactional(async (tx) => {
    const user = await getAuthenticatedUserSession('startpage')
    validateString(id)
    const result = await removeFavorite(tx, user.email, id)
    if (result) {await logEvent(tx, 'INFO', `Deleted favorite ${result.name}`)}
    return result
  }))
}

const FavoriteInputSchema = z.object({
  description: z.string(),
  id: z.uuid(),
  name: z.string().min(1),
  position: z.number().int().min(0),
  url: z.string().min(1),
})
