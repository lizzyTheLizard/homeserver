'use client'
import { ErrorPage } from '@/app/shared/_components/ErrorPage'
import { useSearchParams } from 'next/navigation'

export const metadata = {
  title: 'CoEditor - Discussion Not Found',
}

export default function NotFound() {
  const searchParams = useSearchParams(),
   did = searchParams.get('id')
  return did
    ? ErrorPage({ message: `A discussion with id ${did} could not be found.`, name: 'Discussion Not Found' })
    : ErrorPage({ message: 'No discussion id provided.', name: 'Discussion Not Found' })
}
