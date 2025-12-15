import { logout } from '../auth'

export async function GET() {
  const endSessionUrl = await logout()
  return Response.redirect(endSessionUrl.href)
}
