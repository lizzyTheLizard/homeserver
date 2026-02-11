import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { loadData, MonthlyData } from './server'
import { fromUrlString, toString } from '@/app/cash/_helper/Period'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { isMonthlyPeriod, MonthlyPeriod } from '@/app/cash/_helper/MonthlyPeriod'
import { PeriodPicker } from '@/app/cash/_components/PeriodPicker'
import { MonthlyInit } from './MonthlyInit'
import { MonthlyNeon } from './MonthlyNeon'
import { MonthlyCreditCard } from './MonthlyCreditCard'
import { MonthlyShared } from './MonthlyShared'
import { MonthlyFinished } from './MonthlyFinished'

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
    if (!isMonthlyPeriod(period)) throw new Error('Invalid period')
    const data = await loadData(projectId, period)
    return (
      <main>
        <ActionTitle>
          <h1>{`Monthly Closing ${toString(period)}`}</h1>
          <PeriodPicker period={period} project_id={projectId} />
        </ActionTitle>
        {getContent(data, period, projectId)}
      </main>
    )
  })
}

function getContent(data: MonthlyData, period: MonthlyPeriod, projectId: string) {
  if (!data.monthly)
    return (<MonthlyInit period={period} project_id={projectId} {...data} />)
  switch (data.monthly.state) {
    case 'NEON':
      return (<MonthlyNeon {...data} period={period} project_id={projectId} monthly={data.monthly} />)
    case 'CREDITCARD':
      return (<MonthlyCreditCard {...data} period={period} project_id={projectId} monthly={data.monthly} />)
    case 'SHARED':
      return (<MonthlyShared {...data} period={period} project_id={projectId} monthly={data.monthly} />)
    case 'FINISHED':
      return (<MonthlyFinished {...data} period={period} project_id={projectId} monthly={data.monthly} />)
    default:
      throw new Error('Unknown monthly status')
  }
}
