import { Config } from './Config'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { loadConfig } from './server'

export const metadata = {
  title: 'Admin - Configuration',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const config = await loadConfig()
    return (
      <main>
        <h1>Configuration</h1>
        <Config data={config} />
      </main>
    )
  })
}
