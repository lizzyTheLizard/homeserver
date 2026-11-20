import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { FavoritesContent } from './_components/FavoritesContent'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>Favorites</h1>
      </ActionTitle>
      <FavoritesContent favorites={[]} />
      <LoadingSpinner />
    </main>
  )
}
