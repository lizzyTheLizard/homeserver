import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { History } from './History'

export default function Loading() {
  return (
    <>
      <LoadingSpinner />
      <History discussions={[]} />
    </>
  )
}
