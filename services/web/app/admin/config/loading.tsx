import { Config } from './_components/Config'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'

export default function Loading() {
  return (
    <main>
      <Config data={[]} />
      <LoadingSpinner />
    </main>
  )
}
