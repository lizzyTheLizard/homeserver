import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'Cash - Closing',
}

export default function Page() {
  return serverPageFunction(metadata.title, () => {
  // TODO: Implement closing page
    return 'To be implemented'
  })
}
