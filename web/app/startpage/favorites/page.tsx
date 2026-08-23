import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { loadFavorites } from './server'
import { FavoritesContent } from './_components/FavoritesContent'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

export const metadata = {
  title: 'StartPage - Favorites',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const favorites = await loadFavorites()
    return (
      <main>
        <ActionTitle>
          <h1>Favorites</h1>
        </ActionTitle>
        <FavoritesContent favorites={favorites} />
      </main>
    )
  })
}
