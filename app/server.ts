'use server'

import { applications } from './shared/Application'
import { getAuthenticatedUserSession } from './shared/auth/auth'
import { nontransactional } from './shared/_external/db/access'
import { findFavoritesByOwner } from './startpage/_data/Favorite'

export async function loadPortalData() {
  const user = await getAuthenticatedUserSession()

  const apps = applications
    .filter(a => user.applications.includes(a.key))
    .map(({ key, name, icon, link, description }) => ({ key, name, icon, link, description }))

  const favorites = await nontransactional(c => findFavoritesByOwner(c, user.email))

  return { apps, favorites }
}
