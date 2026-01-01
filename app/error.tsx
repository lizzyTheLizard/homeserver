'use client'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { ErrorPage } from './shared/components/ErrorPage'

export const metadata: Metadata = {
  title: 'Gutschi.site - Error',
}

export default function Page({ error}: { error: Error }) {
  return ErrorPage({ error })
}
