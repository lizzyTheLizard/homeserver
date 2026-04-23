'use client'
import { ErrorPage } from './shared/_components/ErrorPage'

export const metadata = {
  title: 'Gutschi.site - Error',
}

export default function Page({ error }: { error: Error }) {
  return ErrorPage({ error })
}
