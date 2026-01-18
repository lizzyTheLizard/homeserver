import { serverPageFunction } from '@/app/shared/PageFunction'
  
export const metadata = {
  title: 'Cash - Reports',
}

export default function Page() {
  return serverPageFunction(metadata.title, async () => {
  // TODO: Implement reports page
  return 'To be implemented'
  }
}
