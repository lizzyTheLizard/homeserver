import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { History } from './_components/History'
import { loadHistory } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'CoEditor - History',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const discussions = await loadHistory()
    return (
      <main>
        <ActionTitle>
          <h1>History</h1>
        </ActionTitle>
        <History discussions={discussions} />
      </main>
    )
  })
}
