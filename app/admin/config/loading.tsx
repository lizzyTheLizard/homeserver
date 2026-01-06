import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Config } from './Config'

export default function Loading() {
  return (
    <>
      <LoadingSpinner />
      <Config data={[]} />
    </>
  )
}
