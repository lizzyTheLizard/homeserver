import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Accounts } from './Accounts'

export default function Loading() {
  return (
    <>
      <LoadingSpinner />
      <Accounts />
    </>
  )
}
