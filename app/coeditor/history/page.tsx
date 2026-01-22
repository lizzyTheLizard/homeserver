import { History } from './History'
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
        <h1>History</h1>
        <History discussions={discussions} />
      </main>
    )
  })
}
