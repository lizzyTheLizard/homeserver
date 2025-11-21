import { getMyTemplates, updateTemplate, type Template } from './coeditor/Template.js'
import { expectedError, isBackendError } from './BackendError.js'
import { getDatabaseHandle } from './getDatabaseHandle.js'
import { getUser } from './getUser.js'
import { getCorsHeaders } from './getCorsHeaders.js'
import { type Event } from './Context.js'

const db = await getDatabaseHandle()

export async function handler(event: Event): Promise<Reponse> {
  if (event.httpMethod === 'OPTIONS') return ok(undefined)
  const user = await getUser(event)
  const context = { event, user, db }
  try {
    if (event.httpMethod === 'GET' && event.path === '/api/coeditor/templates')
      return ok(await getMyTemplates(context))
    if (event.httpMethod === 'PUT' && event.path === '/api/coeditor/templates') {
      if (!event.body) throw expectedError('Request body is missing', 400, 'Bad Request')
      const template = JSON.parse(event.body) as Template
      return ok(await updateTemplate(context, template))
    }
    throw expectedError(event.httpMethod + ' ' + event.path + ' not Found', 404, 'Not Found')
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

function ok(body: unknown): Reponse {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(),
    },
    body: body === undefined ? '' : JSON.stringify(body),
  }
}

function error(error: unknown): Reponse {
  if (isBackendError(error)) {
    console.error('Handle Backend Error:', error.showStack ? error : error.message)
    return {
      statusCode: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.userMessage }),
    }
  }
  console.error('Handle Unexpected Error:', error)
  return {
    statusCode: 500,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Unexpected error' }),
  }
}

/* This is used to test locally and will not be executed on Scaleway Functions */
if (process.env.NODE_ENV === 'test') {
  import('@scaleway/serverless-functions')
    .then((scw_fnc_node) => { scw_fnc_node.serveHandler(handler, 8080) })
    .catch((err: unknown) => { console.error('Error starting server:', err) })
}
