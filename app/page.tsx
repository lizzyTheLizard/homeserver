import { serverPageFunction } from './shared/_helper/PageFunction'
import { getInitialGreeting, loadPortalData, sendMessage } from './server'
import { AiChatWindow } from './startpage/_components/AiChatWindow'
import { Clock } from './startpage/_components/Clock'
import { Portal } from './startpage/_components/Portal'
import { Favorites } from './startpage/_components/Favorites'

export const metadata = {
  title: 'Gutschi.site - Dashboard',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const { apps, favorites } = await loadPortalData()
    return (
      <main className="fullscreen">
        <Clock />
        <AiChatWindow getInitialGreeting={getInitialGreeting} sendMessage={sendMessage} />
        <Portal apps={apps} />
        <Favorites items={favorites} />
      </main>
    )
  })
}
