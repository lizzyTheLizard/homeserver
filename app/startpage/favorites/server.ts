'use server'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { validateObject, validateString } from '@/app/shared/_helper/validation'
import { createOrModifyFavorite, Favorite, FavoriteInput, findFavoritesByOwner, removeFavorite } from '@/app/startpage/_data/Favorite'

export async function loadFavorites(): Promise<Favorite[]> {
  const user = await getAuthenticatedUserSession('startpage')
  return nontransactional(c => findFavoritesByOwner(c, user.email))
}

export async function saveFavorite(input: FavoriteInput): ActionResponse<Favorite> {
  return toResponse(transactional(async (tx) => {
    const user = await getAuthenticatedUserSession('startpage')
    validateObject(input, FavoriteInputConstraints)
    return createOrModifyFavorite(tx, user.email, input)
  }))
}

export async function deleteFavorite(id: string): ActionResponse<Favorite | undefined> {
  return toResponse(transactional(async (tx) => {
    const user = await getAuthenticatedUserSession('startpage')
    validateString(id)
    return removeFavorite(tx, user.email, id)
  }))
}

const FavoriteInputConstraints = {
  id: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      message: 'must be a valid UUID',
    },
  },
  position: {
    presence: { allowEmpty: false },
    type: 'number',
    numericality: { onlyInteger: true, greaterThanOrEqualTo: 0 },
  },
  name: { presence: { allowEmpty: false }, type: 'string' },
  url: { presence: { allowEmpty: false }, type: 'string' },
  description: { presence: { allowEmpty: true }, type: 'string' },
}
