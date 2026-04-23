import { serverPageFunction } from './shared/_helper/PageFunction'
import { PortalContent } from './shared/_components/PortalContent'
import { loadPortalData } from './server'

export const metadata = {
  title: 'Gutschi.site - Dashboard',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const { apps, weather } = await loadPortalData()
    return (
      <main>
        <PortalContent apps={apps} weather={weather} />
      </main>
    )
  })
}
