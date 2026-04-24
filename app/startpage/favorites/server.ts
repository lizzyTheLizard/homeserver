'use server'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { createFavorite, Favorite, FavoriteInput, findFavoritesByOwner, removeFavorite, updateFavorite } from '@/app/startpage/_data/Favorite'

export async function loadFavorites(): Promise<Favorite[]> {
  const user = await getAuthenticatedUserSession()
  return nontransactional(c => findFavoritesByOwner(c, user.sub))
}

export async function saveFavorite(input: FavoriteInput): ActionResponse<Favorite> {
  return toResponse(transactional(async (tx) => {
    const user = await getAuthenticatedUserSession()
    return createFavorite(tx, user.sub, input)
  }))
}

export async function editFavorite(id: string, input: FavoriteInput): ActionResponse<Favorite> {
  return toResponse(transactional(async (tx) => {
    const user = await getAuthenticatedUserSession()
    return updateFavorite(tx, user.sub, id, input)
  }))
}

export async function deleteFavorite(id: string): ActionResponse<Favorite | undefined> {
  return toResponse(transactional(async (tx) => {
    const user = await getAuthenticatedUserSession()
    return removeFavorite(tx, user.sub, id)
  }))
}
