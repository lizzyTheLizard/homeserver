import { BackendError, expectedError, isBackendError } from './BackendError.js'
import { getDatabaseHandle } from './getDatabaseHandle.js'
import { getUser } from './getUser.js'
import { getCorsHeaders } from './getCorsHeaders.js'
import { type Context, type Event } from './Context.js'
import { getMyTemplates } from './coeditor/template/getMyTemplates.js'
import { updateTemplate } from './coeditor/template/updateTemplate.js'
import { getDiscussion, getMyDiscussions } from './coeditor/discussion/getDiscussion.js'
import { executeCommand } from './coeditor/command/executeCommand.js'
import { startDiscussion } from './coeditor/discussion/startDiscussion.js'

const db = await getDatabaseHandle()

export async function handler(event: Event): Promise<Reponse> {
  if (event.httpMethod === 'OPTIONS') return ok(undefined)
  const user = await getUser(event)
  const context = { event, user, db }
  try {
    if (event.path.startsWith('/api/coeditor/')) return await handleCoeditorRequest(context)
    throw pathNotFound(context)
  }
  catch (err: unknown) {
    return error(err)
  }
}

async function handleCoeditorRequest(context: Context): Promise<Reponse> {
  if (context.event.path === '/api/coeditor/templates') {
    if (context.event.httpMethod === 'GET') return ok(await getMyTemplates(context))
    if (context.event.httpMethod !== 'PUT') throw methodNotAllowed(context)
    if (!context.event.body) throw expectedError('Request body is missing', 400, 'Bad Request')
    const template = JSON.parse(context.event.body) as unknown
    return ok(await updateTemplate(context, template))
  }
  if (context.event.path === '/api/coeditor/commands') {
    if (context.event.httpMethod !== 'PUT') throw methodNotAllowed(context)
    if (!context.event.body) throw expectedError('Request body is missing', 400, 'Bad Request')
    const command = JSON.parse(context.event.body) as unknown
    return ok(await executeCommand(context, command))
  }
  if (context.event.path === '/api/coeditor/discussions') {
    if (context.event.httpMethod === 'GET') return ok(await getMyDiscussions(context))
    if (context.event.httpMethod !== 'POST') throw methodNotAllowed(context)
    if (!context.event.body) throw expectedError('Request body is missing', 400, 'Bad Request')
    const discussion = JSON.parse(context.event.body) as unknown
    return ok(await startDiscussion(context, discussion))
  }
  if (context.event.path.startsWith('/api/coeditor/discussions/')) {
    const event = context.event
    const id = event.path.substring('/api/coeditor/discussions/'.length).split('/')[0]
    if (!id) throw expectedError('Discussion ID is missing', 400, 'Bad Request')
    if (context.event.path === `/api/coeditor/discussions/${id}`) {
      if (context.event.httpMethod === 'GET') return ok(await getDiscussion(context, id))
      throw methodNotAllowed(context)
    }
  }
  throw pathNotFound(context)
}

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

function methodNotAllowed(context: Context): BackendError {
  const message = `Method ${context.event.httpMethod} not allowed on path ${context.event.path}`
  return expectedError(message, 405, 'Method Not Allowed')
}

function pathNotFound(content: Context): BackendError {
  const message = `Path ${content.event.path} not found`
  return expectedError(message, 404, 'Not Found')
}

/* This is used to test locally and will not be executed on Scaleway Functions */
if (process.env.NODE_ENV === 'test') {
  import('@scaleway/serverless-functions')
    .then((scw_fnc_node) => { scw_fnc_node.serveHandler(handler, 8080) })
    .catch((err: unknown) => { console.error('Error starting server:', err) })
}
