import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Config } from './Config'

export default function Loading() {
  return (
    <main>
      <LoadingSpinner />
      <h1>Configuration</h1>
      <Config data={[]} />
    </main>
  )
}
