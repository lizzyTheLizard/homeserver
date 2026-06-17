import { serverPageFunction } from './shared/_helper/PageFunction'
import { PortalContent } from './common/_components/PortalContent'
import { loadPortalData } from './server'
import { connection } from 'next/server'

export const metadata = {
  title: 'Gutschi.site - Dashboard',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    // No prerendering as we want to show the current weather and the user's favorites, which may change frequently.
    await connection()
    const { apps, weather, favorites } = await loadPortalData()
    return (
      <main>
        <PortalContent apps={apps} weather={weather} favorites={favorites} />
      </main>
    )
  })
}
