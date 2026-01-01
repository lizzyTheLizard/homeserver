import style from './ErrorPage.module.css'

export type ErrorPageProps = { error: Error } | { message: string, name: string }

export function ErrorPage(props: ErrorPageProps) {
  const name = 'name' in props ? props.name : props.error.name
  const message = 'error' in props ? props.error.message : props.message
  return (
    <main>
      <h1>{name}</h1>
      <p>{message}</p>
      {'error' in props && (<div className={style.errorStack}>{props.error.stack}</div>)}
    </main>
  )
}
