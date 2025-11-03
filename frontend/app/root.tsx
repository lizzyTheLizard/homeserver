import 'homeserver-webcomponents/style.css'
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useMatches } from 'react-router'
import type { Route } from './+types/root'
import { GsHeader, GsHeaderLink, GsInfo } from 'homeserver-webcomponents/react'
import { getApplicationFromMatches } from './application'
import ErrorPage from './general/ErrorPage'

export const links: Route.LinksFunction = () => []

export function Layout({ children }: { children: React.ReactNode }) {
  const matches = useMatches()
  const application = getApplicationFromMatches(matches)
  // TODO: Login
  const user = { email: 'john@example.com', portalAccess: true }
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <GsHeader applicationName={application.name} user={user.email} portalAccess={user.portalAccess}>
          {application.links.map(link =>
            <GsHeaderLink key={link.href} href={link.href}>{link.text}</GsHeaderLink>,
          )}
        </GsHeader>
        <GsInfo />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage title="404 Not Found" message="The requested page could not be found" />
  }
  if (isRouteErrorResponse(error)) {
    return <ErrorPage errorResponse={error} />
  }
  if (error instanceof Error) {
    return <ErrorPage error={error} />
  }
  return <ErrorPage />
}
