import { Journal } from './Journal'
import { stringToPeriod } from '@/app/cash/_helper/Period'
import { loadAccountJournal, loadJournal } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { AccountJournal } from './AccountJournal'

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
      const journalData = await loadAccountJournal(period, projectId, accountId)
      return (
        <main>
          <AccountJournal {...journalData} period={period} project_id={projectId} />
        </main>
      )
    }
    else {
      const journalData = await loadJournal(period, projectId)
      return (
        <main>
          <Journal {...journalData} period={period} project_id={projectId} />
        </main>
      )
    }
  })
}
