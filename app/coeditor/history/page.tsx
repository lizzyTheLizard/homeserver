import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { getUserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/db'
import { findDiscussionByOwner } from '../Discussion'
import { History } from './History'

export const metadata: Metadata = {
  title: 'CoEditor - History',
}

export default async function Page() {
  const user = await getUserSession()
  if (!user) throw new Error('User not authenticated')
  const discussions = await transactional(client => findDiscussionByOwner(client, user.sub))

  return (
    <History discussions={discussions} />
  )
}
