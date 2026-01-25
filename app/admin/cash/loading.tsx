import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Cash } from './Cash'

export default function Loading() {
  return (
    <main>
      <Cash projects={[]} />
      <LoadingSpinner></LoadingSpinner>
    </main>
  )
}
