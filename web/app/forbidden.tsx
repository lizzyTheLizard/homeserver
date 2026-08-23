'use client'
import { ErrorPage } from './shared/_components/ErrorPage'

export default function Forbidden() {
  return (<ErrorPage name="403 Forbidden" message="You do not have permission to access this page." />)
}
