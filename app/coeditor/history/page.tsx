import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { History } from './History'
import { loadHistory } from './server'

export const metadata: Metadata = {
  title: 'CoEditor - History',
}

export default async function Page() {
  const discussions = await loadHistory()
  return <History discussions={discussions} />
}
