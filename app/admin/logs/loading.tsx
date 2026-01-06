import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Log } from './Log'

export default function Loading() {
  return (
    <>
      <LoadingSpinner />
      <Log lines={[]} />
    </>
  )
}
