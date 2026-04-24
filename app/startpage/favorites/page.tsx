import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { loadFavorites } from './server'
import { FavoritesContent } from './_components/FavoritesContent'

export const metadata = {
  title: 'StartPage - Favorites',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const favorites = await loadFavorites()
    return (
      <main>
        <FavoritesContent favorites={favorites} />
      </main>
    )
  })
}
