import { AiChatWindow } from './startpage/_components/AiChatWindow'
import { Clock } from './startpage/_components/Clock'

export const metadata = {
  title: 'Gutschi.site - Dashboard',
}

export default function Page() {
  return (
    <main className="fullscreen">
      <Clock />
      <AiChatWindow />
    </main>
  )
}
