'use client'
import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { checkMicrosoftStatus } from '../server'
import styles from './MicrosoftWaitForConnection.module.css'

interface MicrosoftWaitForConnectionProps {
  initialMailStatus: string
  initialTodoStatus: string
  initialCalendarStatus: string
}

export function MicrosoftWaitForConnection({ initialMailStatus, initialTodoStatus, initialCalendarStatus }: MicrosoftWaitForConnectionProps) {
  const [mailStatus, setMailStatus] = useState(initialMailStatus)
  const [todoStatus, setTodoStatus] = useState(initialTodoStatus)
  const [calendarStatus, setCalendarStatus] = useState(initialCalendarStatus)

  useEffect(() => {
    const interval = setInterval(() => {
      checkMicrosoftStatus().then((result) => {
        setMailStatus(result.mailStatus)
        setTodoStatus(result.todoStatus)
        setCalendarStatus(result.calendarStatus)
      }).catch(() => undefined)
    }, 1000)
    return () => { clearInterval(interval) }
  }, [])

  useEffect(() => {
    if (mailStatus === 'connected' && todoStatus === 'connected' && calendarStatus === 'connected') {
      window.location.reload()
    }
  }, [mailStatus, todoStatus, calendarStatus])

  const hasError = mailStatus === 'error' || todoStatus === 'error' || calendarStatus === 'error'

  if (hasError) {
    return (
      <div className={styles.error}>
        Failed to connect to Microsoft services. Please try again later.
      </div>
    )
  }

  return <LoadingSpinner text="Connecting to Microsoft..." />
}
