import type { ErrorResponse } from 'react-router'
import { Header } from './header/Header'

export default function ErrorPage(props: { title?: string, message?: string, error?: Error, errorResponse?: ErrorResponse }) {
  return (
    <>
      <Header />
      <main>
        <h1>{props.title ?? 'Error'}</h1>
        <p>
          {props.errorResponse?.statusText ?? props.error?.message ?? props.message ?? 'An unexpected error occurred.'}
          <br />
          <a href="/">Back to the main page.</a>
        </p>
        {props.error?.stack && (
          <>
            <h2>Stack trace</h2>
            <code className="stacktrace">{props.error.stack}</code>
          </>
        )}
      </main>
    </>
  )
}
