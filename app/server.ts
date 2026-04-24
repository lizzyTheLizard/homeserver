import { config } from './shared/config'
import { applications } from './common/Application'
import { getAuthenticatedUserSession } from './common/auth/auth'
import { fetchWeather } from './shared/_external/openmeteo'
import { WeatherInfo } from './shared/_components/WeatherBlock'
import { nontransactional } from './shared/_external/db/access'
import { findFavoritesByOwner } from './startpage/_data/Favorite'

export async function loadPortalData() {
  const location = config.WEATHER_API_LOCATION
  const [user, raw] = await Promise.all([
    getAuthenticatedUserSession(),
    location ? fetchWeather(location) : Promise.resolve(undefined),
  ])

  const weather: WeatherInfo | undefined = raw
    ? { ...raw, detailUrl: config.WEATHER_DETAIL_URL ?? null }
    : undefined

  const apps = applications
    .filter(a => user.applications.includes(a.key))
    .map(({ key, name, icon, link, description }) => ({ key, name, icon, link, description }))

  const rawFavorites = await nontransactional(c => findFavoritesByOwner(c, user.sub))
  const favorites = rawFavorites.map(({ id, name, url }) => ({ id, name, url }))

  return { apps, weather, favorites }
}
