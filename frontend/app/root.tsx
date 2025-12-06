import 'homeserver-webcomponents/style.css'
import './vars.css'
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import type { Route } from './+types/root'
import { AuthProvider } from './general/auth/AuthProvider'
import { Header } from './general/header/Header'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InfoProvider } from './general/info/InfoProvider'
import ErrorPage from './general/ErrorPage'
import { LoadingProvider } from './general/loading/LoadingProvider'

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

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InfoProvider>
          <LoadingProvider>
            <Header />
            <Outlet />
          </LoadingProvider>
        </InfoProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage title="404 Not Found" message="The requested page could not be found" />
  }
  if (isRouteErrorResponse(error) && error.status === 403) {
    return <ErrorPage title="403 Forbidden" message="You do not have permission to access this page" />
  }
  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage title="401 Unauthorized" message="You are not authorized to access this page. Please log in again" />
  }
  if (isRouteErrorResponse(error)) {
    return <ErrorPage errorResponse={error} />
  }
  if (error instanceof Error) {
    return <ErrorPage error={error} />
  }
  return <ErrorPage />
}
