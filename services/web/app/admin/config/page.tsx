import { Config } from './_components/Config'
import { loadConfig } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'Admin - Configuration',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const config = await loadConfig()
    return (
      <main>
        <Config data={config} />
      </main>
    )
  })
}
