import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { Config } from './Config'
import { serverPageFunction } from '@/app/shared/PageFunction'

export const metadata = {
  title: 'Admin - Configuration',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    await getAuthenticatedUserSession('admin')
    const data = Object.keys(process.env)
      .map(key => ({ id: key, key, value: process.env[key] }))

    return (
      <Config data={data} />
    )
  })
}
