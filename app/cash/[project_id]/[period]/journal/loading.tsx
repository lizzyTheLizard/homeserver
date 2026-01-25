import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Journal } from './Journal'

export default function Loading() {
  return (
    <main>
      <Journal accounts={[]} transactions={[]} />
      <LoadingSpinner />
    </main>
  )
}
