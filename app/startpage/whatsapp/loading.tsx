import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { WhatsAppContent } from './_components/WhatsAppContent'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>WhatsApp</h1>
      </ActionTitle>
      <WhatsAppContent chats={[]} status={{ type: 'notstarted' }} />
      <LoadingSpinner></LoadingSpinner>
    </main>
  )
}
