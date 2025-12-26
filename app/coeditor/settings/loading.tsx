import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { Settings } from './Settings'

export default function Loading() {
  return (
    <main>
      <h1>Settings</h1>
      <LoadingSpinner></LoadingSpinner>
      <Settings profiles={[]} templates={[]} />
    </main>
  )
}
