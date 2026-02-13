import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Config } from './_components/Config'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>Configuration</h1>
      </ActionTitle>
      <Config data={[]} />
      <LoadingSpinner></LoadingSpinner>
    </main>
  )
}
