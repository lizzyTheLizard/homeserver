import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { notFound } from 'next/navigation'
import { Journal } from './Journal'
import { stringToPeriod } from '@/app/cash/Period'
import { deleteTransaction, loadJournal, saveTransaction } from './server'

export const metadata: Metadata = {
  title: 'Cash - Journal',
}

export interface JournalPageProps {
  params: Promise<{
    project_id: string
    period: string
  }>
  searchParams: { accountId: string | undefined }
}

export default async function Page({ params, searchParams }: JournalPageProps) {
  const paramsResolved = await params
  const period = stringToPeriod(paramsResolved.period)
  const projectId = paramsResolved.project_id
  const accountId = searchParams.accountId
  if (accountId) {
    // TODO: Show account specific journal
    notFound()
  }
  else {
    const journalData = await loadJournal(period, projectId)
    return (
      <Journal
        project_id={journalData.project.id}
        period={period}
        accounts={journalData.accounts}
        transactions={journalData.transactions}
        onDeleteTransaction={deleteTransaction}
        onSaveTransaction={saveTransaction}
      />
    )
  }
}
