import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional } from '@/app/shared/db'
import { findDiscussionByOwner } from '../Discussion'
import { History } from './History'

export const metadata: Metadata = {
  title: 'CoEditor - History',
}

export default async function Page() {
  const user = await getAuthenticatedUserSession()
  const discussions = await nontransactional(c => findDiscussionByOwner(c, user.sub))

  return (
    <main>
      <h1>History</h1>
      <History discussions={discussions} />
    </main>
  )
}
