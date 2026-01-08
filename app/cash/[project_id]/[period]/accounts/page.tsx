import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { Accounts } from './Accounts'
import { loadAccounts } from './server'

export const metadata: Metadata = {
  title: 'Cash - Accounts',
}

export interface AccountPageProps {
  params: Promise<{
    project_id: string
    period: string
  }>
}

export default async function Page({ params }: AccountPageProps) {
  const paramsResolved = await params
  const accounts = await loadAccounts(paramsResolved.project_id)
  return (
    <Accounts accounts={accounts} />
  )
}
