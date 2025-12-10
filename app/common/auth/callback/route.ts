import { callback } from '../lib'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const redirect = await callback(request)
  return Response.redirect(redirect)
}
