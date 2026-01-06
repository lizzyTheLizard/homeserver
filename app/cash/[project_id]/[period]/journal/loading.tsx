import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Journal } from './Journal'

export default function Loading() {
  return (
    <>
      <LoadingSpinner />
      <Journal />
    </>
  )
}
