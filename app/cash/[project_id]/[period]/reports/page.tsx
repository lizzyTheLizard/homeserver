import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { Reports } from './Reports'
import { stringToPeriod } from '@/app/cash/_helper/Period'
import { loadReports } from './server'

export const metadata = {
  title: 'Cash - Reports',
}

export interface ReportsPageProps {
  params: Promise<{
    project_id: string
    period: string
  }>
}

export default async function Page({ params }: ReportsPageProps) {
  return serverPageFunction(metadata.title, async () => {
    const projectId = (await params).project_id
    const period = stringToPeriod((await params).period)
    const data = await loadReports(period, projectId)
    return (
      <main>
        <Reports {...data} project_id={projectId} period={period} />
      </main>
    )
  })
}
