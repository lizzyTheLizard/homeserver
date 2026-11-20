import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { Reports } from './_components/Reports'
import { fromUrlString, toString } from '@/app/cash/_helper/Period'
import { loadReports } from './server'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

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
    const period = fromUrlString((await params).period)
    const data = await loadReports(period, projectId)
    return (
      <main>
        <ActionTitle>
          <h1>{'Report ' + toString(period)}</h1>
        </ActionTitle>
        <Reports {...data} project_id={projectId} period={period} />
      </main>
    )
  })
}
