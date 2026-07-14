import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { MicrosoftUserInfo } from './_components/MicrosoftUserInfo'
import { MicrosoftMail } from './_components/MicrosoftMail'
import { MicrosoftTodo } from './_components/MicrosoftTodo'
import { MicrosoftCalendar } from './_components/MicrosoftCalendar'
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
        {status.connected && (
          <>
            <MicrosoftMail messages={status.messages} />
            <MicrosoftTodo todos={status.todos} />
            <MicrosoftCalendar events={status.events} />
          </>
        )}
        <MicrosoftUserInfo connected={status.connected} userInfo={status.userInfo} />
      </main>
    )
  })
}
