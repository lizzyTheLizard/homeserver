import { logout } from '../lib'

export async function GET() {
  const endSessionUrl = await logout()
  return Response.redirect(endSessionUrl.href)
}
