'use client'
import style from './ErrorPage.module.css'

export type ErrorPageProps = { error: Error } | { message: string, name: string }

export function ErrorPage(props: ErrorPageProps) {
  const name = 'name' in props ? props.name : props.error.name
  const message = 'error' in props ? props.error.message : props.message
  return (
    <main>
      <h1>{name}</h1>
      <p>{message}</p>
      <p>
        You can either
        {' '}
        <a href="/">go back to the main page</a>
        {' '}
        or
        {' '}
        <a href="#" onClick={(e) => { history.back(); e.preventDefault() }}>go back to the last page</a>
      </p>
      {'error' in props && (<div className={style.errorStack}>{props.error.stack}</div>)}
    </main>
  )
}
