import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { Config } from './Config'

export const metadata: Metadata = {
  title: 'Admin - Configuration',
}

export default async function Page() {
  await getAuthenticatedUserSession('admin')
  const data = Object.keys(process.env).map(key => ({ id: key, key, value: process.env[key] }))

  return (
    <Config data={data} />
  )
}
