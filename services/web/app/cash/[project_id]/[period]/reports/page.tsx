import { fromUrlString, toString } from '@/app/cash/_helper/Period'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { Reports } from './_components/Reports'
import { loadReports } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

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
    const projectId = (await params).project_id,
     period = fromUrlString((await params).period),
     data = await loadReports(period, projectId)
    return (
      <main>
        <ActionTitle>
          <h1>{`Report ${  toString(period)}`}</h1>
        </ActionTitle>
        <Reports {...data} project_id={projectId} period={period} />
      </main>
    )
  })
}
