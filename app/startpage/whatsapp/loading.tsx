import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>WhatsApp</h1>
      </ActionTitle>
      <LoadingSpinner></LoadingSpinner>
    </main>
  )
}
