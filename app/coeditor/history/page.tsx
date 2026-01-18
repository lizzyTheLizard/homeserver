import { History } from './History'
import { loadHistory } from './server'
import { serverPageFunction } from '@/app/shared/PageFunction'

export const metadata = {
  title: 'CoEditor - History',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const discussions = await loadHistory()
    return <History discussions={discussions} />
  })
}
