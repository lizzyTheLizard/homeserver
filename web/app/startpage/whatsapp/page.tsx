import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { WhatsAppContent } from './_components/WhatsAppContent'
import { loadData } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'StartPage - WhatsApp',
}

export default function Page() {
  return serverPageFunction(metadata.title, async () => {
    const { chats, status } = await loadData()
    return (
      <main>
        <ActionTitle>
          <h1>WhatsApp</h1>
        </ActionTitle>
        <WhatsAppContent chats={chats} status={status} />
      </main>
    )
  })
}
