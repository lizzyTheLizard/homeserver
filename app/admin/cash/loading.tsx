import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Cash } from './Cash'

export default function Loading() {
  return (
    <>
      <LoadingSpinner></LoadingSpinner>
      <Cash />
    </>
  )
}
