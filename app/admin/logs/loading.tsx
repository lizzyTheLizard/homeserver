import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Log } from './Log'

export default function Loading() {
  return (
    <main>
      <h1>Logs</h1>
      <LoadingSpinner />
      <Log lines={[]} />
    </main>
  )
}
