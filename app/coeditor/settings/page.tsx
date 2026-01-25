import { Profiles } from './Profiles'
import { loadSettings } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { Templates } from './Templates'

export const metadata = {
  title: 'CoEditor - Settings',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const settingsData = await loadSettings()
    return (
      <main>
        <Profiles profiles={settingsData.profiles} />
        <Templates templates={settingsData.templates} />
      </main>
    )
  })
}
