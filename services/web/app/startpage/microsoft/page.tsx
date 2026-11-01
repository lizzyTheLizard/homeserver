import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { MicrosoftUserInfo } from './_components/MicrosoftUserInfo'
import { MicrosoftMail } from './_components/MicrosoftMail'
import { MicrosoftTodo } from './_components/MicrosoftTodo'
import { MicrosoftCalendar } from './_components/MicrosoftCalendar'
import { MicrosoftWaitForConnection } from './_components/MicrosoftWaitForConnection'
import { loadMicrosoftStatus } from './server'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'StartPage - Microsoft',
}

export default function Page() {
  return serverPageFunction(metadata.title, async () => {
    const status = await loadMicrosoftStatus().catch((error: unknown) => {
      console.error('Failed to load Microsoft status', error)
      return {
        connected: false,
        mailStatus: 'disconnected',
        todoStatus: 'disconnected',
        calendarStatus: 'disconnected',
        messages: [],
        todos: [],
        events: [],
        userInfo: undefined,
      }
    })
    const allConnected = status.mailStatus === 'connected' && status.todoStatus === 'connected' && status.calendarStatus === 'connected'
    return (
      <main>
        <ActionTitle>
          <h1>Microsoft</h1>
        </ActionTitle>
        {allConnected && (
          <>
            <MicrosoftMail messages={status.messages} />
            <MicrosoftTodo todos={status.todos} />
            <MicrosoftCalendar events={status.events} />
          </>
        )}
        {status.connected && !allConnected && (
          <MicrosoftWaitForConnection
            initialMailStatus={status.mailStatus}
            initialTodoStatus={status.todoStatus}
            initialCalendarStatus={status.calendarStatus}
          />
        )}
        <MicrosoftUserInfo connected={status.connected} userInfo={status.userInfo} />
      </main>
    )
  })
}
