import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { fromUrlString } from '@/app/cash/_helper/Period'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { isMonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'
import { MonthlyInit } from './_components/MonthlyInit'
import { MonthlyNeon } from './_components/MonthlyNeon'
import { MonthlyShared } from './_components/MonthlyShared'
import { MonthlyFinished } from './_components/MonthlyFinished'
import { MonthlyCheckAccount } from './_components/MonthlyCheckAccount'
import { loadData } from './server'
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
          <h1>Monthly Closing</h1>
        </ActionTitle>
        <PeriodPicker period={period} project_id={projectId} />
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
              <h1>Monthly Closing</h1>
            </ActionTitle>
            <PeriodPicker period={period} project_id={projectId} />
            <ActionButton disabled variant="primary">Continue</ActionButton>
            <div>This period is already closed.</div>
          </main>
        )
      case 'NOT_FOUND':
        return (
          <main>
            <ActionTitle>
              <h1>Monthly Closing - Init</h1>
            </ActionTitle>
            <PeriodPicker period={period} project_id={projectId} />
            <MonthlyInit period={period} project_id={projectId} {...pageData} />
          </main>
        )
      case 'NEON':
        return (
          <main>
            <ActionTitle>
              <h1>Monthly Closing - Neon Import</h1>
            </ActionTitle>
            <PeriodPicker period={period} project_id={projectId} />
            <MonthlyNeon period={period} project_id={projectId} {...pageData} />
          </main>
        )
      case 'SHARED':
        return (
          <main>
            <ActionTitle>
              <h1>Monthly Closing - Shared</h1>
            </ActionTitle>
            <PeriodPicker period={period} project_id={projectId} />
            <MonthlyShared period={period} project_id={projectId} {...pageData} />
          </main>
        )
      case 'FINISHED':
        return (
          <main>
            <ActionTitle>
              <h1>Monthly Closing</h1>
            </ActionTitle>
            <PeriodPicker period={period} project_id={projectId} />
            <MonthlyFinished period={period} {...pageData} />
          </main>
        )
      case 'CHECK_ACCOUNT':
        return (
          <main>
            <ActionTitle>
              <h1>{`Monthly Closing - ${pageData.account.name}`}</h1>
            </ActionTitle>
            <PeriodPicker period={period} project_id={projectId} />
            <MonthlyCheckAccount project_id={projectId} period={period} {...pageData} />
          </main>
        )
      default:
        throw new Error('Invalid monthly state')
    }
  })
}
