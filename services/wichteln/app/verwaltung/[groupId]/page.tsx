import { requireGroupManager } from '@/lib/session'
import { GroupManagement } from '../GroupManagement'

export const dynamic = 'force-dynamic'

export default async function ManageGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const { group, role, account } = await requireGroupManager(groupId)

  return <GroupManagement group={group} role={role} viewerAccountId={account?.id ?? null} accounts={[]} />
}
