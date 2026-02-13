import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { fromUrlString, toString } from '@/app/cash/_helper/Period'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { isMonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'
import { MonthlyInit } from './MonthlyInit'
import { MonthlyNeon } from './MonthlyNeon'
import { MonthlyShared } from './MonthlyShared'
import { MonthlyFinished } from './MonthlyFinished'
import { MonthlyCheckAccount } from './MonthlyCheckAccount'
import loadData from './server'
import { ActionButton } from '@/app/shared/_components/ActionButton'

export const metadata = {
  title: 'Cash - Closing',
}

export interface ClosingPageProps {
  params: Promise<{
    project_id: string
    period: string
  }>
}

export default async function Page({ params }: ClosingPageProps) {
  return serverPageFunction(metadata.title, async () => {
    const projectId = (await params).project_id
    const period = fromUrlString((await params).period)

    if (!isMonthlyPeriod(period)) return (
      <main>
        <ActionTitle>
          <h1>{`Closing ${toString(period)}`}</h1>
          <PeriodPicker period={period} project_id={projectId} />
        </ActionTitle>
        <ActionButton disabled variant="primary">Continue</ActionButton>
        <div>This period is not a valid monthly period.</div>
      </main>
    )

    const pageData = await loadData(projectId, period)
    switch (pageData.type) {
      case 'ALREADY_CLOSED':
        return (
          <main>
            <ActionTitle>
              <h1>{`Closing ${toString(period)}`}</h1>
              <PeriodPicker period={period} project_id={projectId} />
            </ActionTitle>
            <ActionButton disabled variant="primary">Continue</ActionButton>
            <div>This period is already closed.</div>
          </main>
        )
      case 'NOT_FOUND':
        return (
          <main>
            <ActionTitle>
              <h1>{`Closing ${toString(period)}`}</h1>
              <PeriodPicker period={period} project_id={projectId} />
            </ActionTitle>
            <MonthlyInit period={period} project_id={projectId} accounts={pageData.accounts} lastMonthClosing={pageData.lastMonthClosing} />
          </main>
        )
      case 'NEON':
        return (
          <main>
            <ActionTitle>
              <h1>{`Closing ${toString(period)}`}</h1>
              <PeriodPicker period={period} project_id={projectId} />
            </ActionTitle>
            <MonthlyNeon period={period} project_id={projectId} monthly={pageData.monthly} accounts={pageData.accounts} />
          </main>
        )
      case 'SHARED':
        return (
          <main>
            <ActionTitle>
              <h1>{`Closing ${toString(period)}`}</h1>
              <PeriodPicker period={period} project_id={projectId} />
            </ActionTitle>
            <MonthlyShared period={period} project_id={projectId} monthly={pageData.monthly} accounts={pageData.accounts} />
          </main>
        )
      case 'FINISHED':
        return (
          <main>
            <ActionTitle>
              <h1>{`Closing ${toString(period)}`}</h1>
              <PeriodPicker period={period} project_id={projectId} />
            </ActionTitle>
            <MonthlyFinished accounts={pageData.accounts} monthly={pageData.monthly} period={period} project_id={projectId} />
          </main>
        )
      case 'CHECK_ACCOUNT':
        return (
          <main>
            <ActionTitle>
              <h1>{`Closing ${toString(period)} - ${pageData.account.name}`}</h1>
              <PeriodPicker period={period} project_id={projectId} />
            </ActionTitle>
            <MonthlyCheckAccount monthly={pageData.monthly} accounts={pageData.accounts} account={pageData.account} transactions={pageData.transactions} lastTransaction={pageData.lastTransaction} project_id={pageData.monthly.project_id} period={pageData.monthly.period} />
          </main>
        )
      default:
        throw new Error('Invalid monthly state')
    }
  })
}
