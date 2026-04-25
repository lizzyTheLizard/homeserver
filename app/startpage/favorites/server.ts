'use server'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { createOrModifyFavorite, Favorite, FavoriteInput, findFavoritesByOwner, removeFavorite } from '@/app/startpage/_data/Favorite'

export async function loadFavorites(): Promise<Favorite[]> {
  const user = await getAuthenticatedUserSession()
  return nontransactional(c => findFavoritesByOwner(c, user.sub))
}

export async function saveFavorite(input: FavoriteInput): ActionResponse<Favorite> {
  return toResponse(transactional(async (tx) => {
    const user = await getAuthenticatedUserSession()
    return createOrModifyFavorite(tx, user.sub, input)
  }))
}

export async function deleteFavorite(id: string): ActionResponse<Favorite | undefined> {
  return toResponse(transactional(async (tx) => {
    const user = await getAuthenticatedUserSession()
    return removeFavorite(tx, user.sub, id)
  }))
}
