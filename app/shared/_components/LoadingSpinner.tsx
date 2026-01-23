import style from './LoadingSpinner.module.css'

export interface LoadingSpinnerProps {
  text?: string
}

/**
 * A simple loading spinner.
 */
export function LoadingSpinner({ text }: LoadingSpinnerProps) {
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
