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
        <h1>CoEditor Settings</h1>
        <h2>Profiles</h2>
        <Profiles profiles={settingsData.profiles} />
        <h2>Templates</h2>
        <Templates templates={settingsData.templates} />
      </main>
    )
  })
}
