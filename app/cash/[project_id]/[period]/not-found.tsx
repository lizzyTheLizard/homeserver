'use client'
import { ErrorPage } from '@/app/shared/_components/ErrorPage'
import { Metadata } from 'next'
import { useParams } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Cash - Project Not Found',
}

export default function NotFound() {
  const params = useParams()
  const pid = params.project_id?.toString()
  return pid
    ? ErrorPage({ name: 'Project Not Found', message: `A project with id ${pid} could not be found.` })
    : ErrorPage({ name: 'Project Not Found', message: 'No project id provided.' })
}
