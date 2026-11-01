import { getConfig } from '@/lib/config'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    getConfig()
    await query('SELECT 1')
    return Response.json({ status: 'ok' })
  }
  catch (error) {
    console.error('Wichteln health check failed:', error)
    return Response.json({ status: 'unhealthy' }, { status: 503 })
  }
}
