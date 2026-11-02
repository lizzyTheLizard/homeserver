import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { FavoritesContent } from './_components/FavoritesContent'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>Favorites</h1>
      </ActionTitle>
      <FavoritesContent favorites={[]} />
      <LoadingSpinner></LoadingSpinner>
    </main>
  )
}
