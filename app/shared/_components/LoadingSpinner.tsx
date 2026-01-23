'use client'
import { useEffect, useState } from 'react'
import { v4 as randomUUID } from 'uuid'
import style from './LoadingSpinner.module.css'

export interface LoadingSpinnerProps {
  text?: string
}

let spinners: { id: string, show: () => void }[] = []

/**
 * A simple loading spinner.
 */
export function LoadingSpinner({ text }: LoadingSpinnerProps) {
  const [id] = useState(randomUUID())
  const [show, setShow] = useState(false)

  useEffect(() => {
    spinners.push({ id, show: () => { setShow(true) } })
    spinners[0].show()
    return () => {
      spinners = spinners.filter(sp => sp.id !== id)
      spinners[0]?.show()
      setShow(false)
    }
  }, [id, setShow])

  if (!show) return null

  return (
    <>
      <div className={style.backdrop}></div>
      <div className={style.overlay}>
        <div className={style.spinner}>
          <div></div>
        </div>
        <div className={style.text}>{text}</div>
      </div>
    </>
  )
}
