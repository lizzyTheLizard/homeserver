import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Log } from './Log'

export default function Loading() {
  return (
    <main>
      <LoadingSpinner />
      <Log lines={[]} />
    </main>
  )
}
