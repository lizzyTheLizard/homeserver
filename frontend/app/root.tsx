import 'homeserver-webcomponents/style.css'
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import type { Route } from './+types/root'
import ErrorPage from './general/ErrorPage'
import { AuthProvider } from './general/auth/AuthProvider'
import { Header } from './general/Header'
import { GsInfo, GsLoadingSpinner } from 'homeserver-webcomponents/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'

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

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Header />
        <Suspense fallback={<GsLoadingSpinner initial={true} />}>
          <Outlet />
        </Suspense>
      </AuthProvider>
      <GsInfo></GsInfo>
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
  if (isRouteErrorResponse(error)) {
    return <ErrorPage errorResponse={error} />
  }
  if (error instanceof Error) {
    return <ErrorPage error={error} />
  }
  return <ErrorPage />
}
