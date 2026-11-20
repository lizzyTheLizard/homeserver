'use client'
import { ErrorPage } from '@/app/shared/_components/ErrorPage'
import { useParams } from 'next/navigation'

export const metadata = {
  title: 'Cash - Project Not Found',
}

export default function NotFound() {
  const params = useParams(),
   pid = params.project_id?.toString()
  return pid
    ? ErrorPage({ message: `A project with id ${pid} could not be found.`, name: 'Project Not Found' })
    : ErrorPage({ message: 'No project id provided.', name: 'Project Not Found' })
}
