import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { MicrosoftContent } from './_components/MicrosoftContent'
import { loadMicrosoftStatus } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'StartPage - Microsoft',
}

export default function Page() {
  return serverPageFunction(metadata.title, async () => {
    const status = await loadMicrosoftStatus()
    return (
      <main>
        <ActionTitle>
          <h1>Microsoft</h1>
        </ActionTitle>
        <MicrosoftContent status={status} />
      </main>
    )
  })
}
