import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Settings } from './Settings'

export default function Loading() {
  return (
    <>
      <LoadingSpinner></LoadingSpinner>
      <Settings profiles={[]} templates={[]} />
    </>
  )
}
