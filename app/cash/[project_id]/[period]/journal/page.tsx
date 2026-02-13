import { Journal } from './_components/Journal'
import { fromUrlString } from '@/app/cash/_helper/Period'
import { loadAccountJournal, loadJournal } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { AccountJournal } from './_components/AccountJournal'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'

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
    const period = fromUrlString((await params).period)
    const projectId = (await params).project_id
    const accountId = (await searchParams).accountId
    if (accountId) {
      const journalData = await loadAccountJournal(period, projectId, accountId)
      return (
        <main>
          <ActionTitle>
            <h1>{journalData.account.name}</h1>
            <PeriodPicker period={period} project_id={projectId} />
          </ActionTitle>
          <AccountJournal {...journalData} period={period} project_id={projectId} />
        </main>
      )
    }
    else {
      const journalData = await loadJournal(period, projectId)
      return (
        <main>
          <ActionTitle>
            <h1>Journal</h1>
            <PeriodPicker period={period} project_id={projectId} />
          </ActionTitle>
          <Journal {...journalData} period={period} project_id={projectId} />
        </main>
      )
    }
  })
}
