import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { notFound } from 'next/navigation'
import { Journal } from './Journal'
import { stringToPeriod } from '@/app/cash/_helper/Period'
import { loadJournal } from './server'

export const metadata: Metadata = {
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
  const paramsResolved = await params
  const period = stringToPeriod(paramsResolved.period)
  const projectId = paramsResolved.project_id
  const accountId = (await searchParams).accountId
  // TODO: Implement period picker
  if (accountId) {
    // TODO: Show account specific journal
    notFound()
  }
  else {
    const journalData = await loadJournal(period, projectId)
    return (
      <Journal accounts={journalData.accounts} transactions={journalData.transactions} />
    )
  }
}
