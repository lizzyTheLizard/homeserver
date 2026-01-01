'use client'
import { ErrorPage } from '@/app/shared/components/ErrorPage'
import { Metadata } from 'next'
import { useSearchParams } from 'next/navigation'

export const metadata: Metadata = {
  title: 'CoEditor - Discussion Not Found',
}

export default function NotFound() {
  const searchParams = useSearchParams()
  const did = searchParams.get('id')
  return did
    ? ErrorPage({ name: 'Discussion Not Found', message: `A discussion with id ${did} could not be found.` })
    : ErrorPage({ name: 'Discussion Not Found', message: 'No discussion id provided.' })
}
