import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Config } from './Config'

export default function Loading() {
  return (
    <>
      <LoadingSpinner />
      <Config />
    </>
  )
}
