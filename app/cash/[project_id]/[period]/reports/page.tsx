import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

export const metadata = {
  title: 'Cash - Reports',
}

export default function Page() {
  return serverPageFunction(metadata.title, () => {
  // TODO: Implement reports page
    return 'To be implemented'
  })
}
