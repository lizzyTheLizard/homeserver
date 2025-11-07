import 'homeserver-webcomponents/style.css'
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import type { Route } from './+types/root'
import ErrorPage from './general/ErrorPage'
import { AuthProvider } from './general/auth/AuthProvider'
import { Header } from './general/Header'
import { GsLoadingSpinner } from 'homeserver-webcomponents/react'
import type { UserManagerSettings } from 'oidc-client-ts'

const authSettings: UserManagerSettings = {
  authority: 'https://login.microsoftonline.com/7bd72b43-52f6-4dc6-a856-5704e0f925bd/v2.0',
  client_id: 'f79682fe-0761-4361-aa2e-317957284c3a',
  redirect_uri: process.env.NODE_ENV === 'production' ? 'https://homeserver-frontend.s3-website.fr-par.scw.cloud/' : 'http://localhost:5173/',
  response_type: 'code',
  scope: 'openid profile email',
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export function HydrateFallback() {
  return <GsLoadingSpinner initial={true} />
}

export default function App() {
  console.log('Starting application on URL ', window.location.href)
  return (
    <AuthProvider authSettings={authSettings}>
      <Header />
      <Outlet />
    </AuthProvider>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage title="404 Not Found" message="The requested page could not be found" />
  }
  if (isRouteErrorResponse(error) && error.status === 403) {
    return <ErrorPage title="403 Forbidden" message="You do not have permission to access this page" />
  }
  if (isRouteErrorResponse(error)) {
    return <ErrorPage errorResponse={error} />
  }
  if (error instanceof Error) {
    return <ErrorPage error={error} />
  }
  return <ErrorPage />
}
