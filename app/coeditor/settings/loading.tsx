import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Settings } from './Settings'

export default function Loading() {
  return (
    <>
      <LoadingSpinner />
      <Settings />
    </>
  )
}
