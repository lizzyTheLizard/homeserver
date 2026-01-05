'use client'
import { ErrorPage } from './shared/components/ErrorPage'

export default function NotFound() {
  return (<ErrorPage name="404 Not Found" message="The requested page could not be found." />)
}
