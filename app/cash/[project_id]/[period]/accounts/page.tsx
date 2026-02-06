import { Accounts } from './Accounts'
import { loadAccounts } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'Cash - Accounts',
}

export interface AccountPageProps {
  params: Promise<{
    project_id: string
    period: string
  }>
}

export default async function Page({ params }: AccountPageProps) {
  return serverPageFunction(metadata.title, async () => {
    const paramsResolved = await params
    const accounts = await loadAccounts(paramsResolved.project_id)
    return (
      <main>
        <Accounts accounts={accounts} project_id={paramsResolved.project_id} />
      </main>
    )
  })
}
