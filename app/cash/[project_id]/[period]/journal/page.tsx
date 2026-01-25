import { Journal } from './Journal'
import { stringToPeriod } from '@/app/cash/_helper/Period'
import { loadJournal } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

export const metadata = {
  title: 'Cash - Journal',
}

export interface JournalPageProps {
  params: Promise<{
    project_id: string
    period: string
  }>
  searchParams: Promise<{ accountId: string | undefined }>
}

export default async function Page({ params, searchParams }: JournalPageProps) {
  return serverPageFunction(metadata.title, async () => {
    const period = stringToPeriod((await params).period)
    const projectId = (await params).project_id
    const accountId = (await searchParams).accountId
    if (accountId) {
    // TODO: Show account specific journal
      throw new Error('Account specific journal not implemented yet')
    }
    else {
      const journalData = await loadJournal(period, projectId)
      return (
        <main>
          <Journal accounts={journalData.accounts} transactions={journalData.transactions} />
        </main>
      )
    }
  })
}
