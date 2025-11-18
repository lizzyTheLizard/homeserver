import { getMyTemplates } from './coeditor/Template.js'
import { BackendError } from './BackendError.js'

export async function handler(event: Event): Promise<Reponse> {
  try {
    if (event.httpMethod === 'GET' && event.path === '/api/coeditor/templates/mine') {
      const templates = await getMyTemplates()
      return ok(templates)
    }
    throw new BackendError(event.httpMethod + ' ' + event.path + ' not Found', 'Not Found', 404, false)
  }
  catch (err: unknown) {
    return error(err)
  }
};

interface Reponse {
  statusCode: number
  headers: Record<string, string | string[]>
  body: string
}

interface Event {
  httpMethod: string
  path: string
}

function ok(body: unknown): Reponse {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function error(error: unknown): Reponse {
  const message = error instanceof Error ? error.message : String(error)
  const userMessage = error instanceof BackendError ? error.userMessage : 'Unknown error'
  const statusCode = error instanceof BackendError ? error.statusCode : 500
  const showStack = error instanceof BackendError ? error.showStack : true
  if (showStack) console.error('Handler error:', error)
  else console.log('Handler error:', message)
  return {
    statusCode: statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: userMessage }),
  }
}

/* This is used to test locally and will not be executed on Scaleway Functions */
if (process.env.NODE_ENV === 'test') {
  import('@scaleway/serverless-functions')
    .then((scw_fnc_node) => { scw_fnc_node.serveHandler(handler, 8080) })
    .catch((err: unknown) => { console.error('Error starting server:', err) })
}
