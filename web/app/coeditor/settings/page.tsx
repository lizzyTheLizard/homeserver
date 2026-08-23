import { Profiles } from './_components/Profiles'
import { loadSettings } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { Templates } from './_components/Templates'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

export const metadata = {
  title: 'CoEditor - Settings',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const settingsData = await loadSettings()
    return (
      <main>
        <ActionTitle>
          <h1>Settings</h1>
        </ActionTitle>
        <Profiles profiles={settingsData.profiles} />
        <Templates templates={settingsData.templates} />
      </main>
    )
  })
}
