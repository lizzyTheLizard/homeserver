import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { Settings } from './Settings'
import { loadSettings } from './server'

export const metadata: Metadata = {
  title: 'CoEditor - Settings',
}

export default async function Page() {
  const settingsData = await loadSettings()
  return <Settings profiles={settingsData.profiles} templates={settingsData.templates} />
}
