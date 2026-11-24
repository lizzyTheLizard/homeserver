import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/session'
import { getGroup, listAccounts } from '@/lib/store'
import { getDb } from '@/lib/db'
import { GroupManagement } from '../../verwaltung/GroupManagement'

export const dynamic = 'force-dynamic'

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  await requireAdmin()
  const { groupId } = await params
  const db = await getDb()
  const group = await getGroup(db, groupId)
  if (!group) notFound()

  const accounts = await listAccounts(db)
  return <GroupManagement group={group} role="admin" viewerAccountId={null} accounts={accounts} />
}
