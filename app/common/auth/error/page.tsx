import { ErrorPage } from '@/app/shared/components/ErrorPage'
import { Metadata } from 'openai/resources/index.js'

export const metadata: Metadata = {
  title: 'Gutschi.site - Auth Error',
}

export default function Page() {
  return ErrorPage({ name: 'Authentication Failed', message: 'The authentication process failed. Please try again.' })
}
