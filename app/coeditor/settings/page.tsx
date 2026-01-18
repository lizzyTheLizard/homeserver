import { Settings } from './Settings'
import { loadSettings } from './server'
import { serverPageFunction } from '@/app/shared/PageFunction'

export const metadata = {
  title: 'CoEditor - Settings',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const settingsData = await loadSettings()
    return <Settings profiles={settingsData.profiles} templates={settingsData.templates} />
  })
}
