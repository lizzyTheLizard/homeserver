import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { PortalContent } from './shared/_components/PortalContent'

export default function Loading() {
  return (
    <main>
      <LoadingSpinner />
      <PortalContent apps={[]} weather={undefined} favorites={[]} />
    </main>
  )
}
