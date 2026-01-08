import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { Logs } from './Logs'

export default function Loading() {
  return (
    <>
      <LoadingSpinner />
      <Logs />
    </>
  )
}
