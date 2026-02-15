import { Config } from './_components/Config'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { loadConfig } from './server'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

export const metadata = {
  title: 'Admin - Configuration',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const config = await loadConfig()
    return (
      <main>
        <ActionTitle>
          <h1>Configuration</h1>
        </ActionTitle>
        <Config data={config} />
      </main>
    )
  })
}
