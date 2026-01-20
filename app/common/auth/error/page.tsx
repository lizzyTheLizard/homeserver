import { ErrorPage } from '@/app/shared/_components/ErrorPage'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'Gutschi.site - Auth Error',
}

export default function Page() {
  return serverPageFunction(metadata.title, () => {
    return ErrorPage({ name: 'Authentication Failed', message: 'The authentication process failed. Please try again.' })
  })
}
