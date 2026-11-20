import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>WhatsApp</h1>
      </ActionTitle>
      <LoadingSpinner />
    </main>
  )
}
