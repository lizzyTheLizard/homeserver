import fastify, { FastifyContentTypeParser, FastifyInstance, FastifyReply, FastifyRequest, preValidationHookHandler } from 'fastify'
import { formatHTTPEvent } from './event'
import { formatContext } from './context'
import plugin from '@fastify/url-data'

const MAX_CONTENT_LENGTH = 6291456

export interface Handler {
  functionName: string
  path: string
  method: string
  handler: (event: Record<string, unknown>, context: Record<string, unknown>, cb: unknown) => unknown
}

export async function emulateCoreProcess(handler: Handler, request: FastifyRequest, reply: FastifyReply) {
  let responseSentByCallback = false
  const callback = (error: Error | undefined, result: FastifyReply) => {
    responseSentByCallback = true
    if (error) handleError(reply, error)
    else handleResponse(reply, result)
  }
  const event = formatHTTPEvent(request)
  const context = formatContext(handler)

  try {
    const functionResult = await handler.handler(event, context, callback)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!responseSentByCallback) {
      handleResponse(reply, functionResult)
    }
  }
  catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    handleError(reply, new Error(`function invocation failed: ${err}`)); return
  }
}

const parseMultipartFormData: FastifyContentTypeParser = (_, payload, done) => {
  let body = ''
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  payload.on('data', (d) => { body += d })
  payload.on('end', () => { done(null, body) })
}

const preValidation: preValidationHookHandler = (request, reply, done) => {
  if (request.url == '/favicon.ico' || request.url == '/robots.txt')
    console.error('request will be rejected for calling favicon.ico or robots.txt')
  if (+(request.headers['content-length'] ?? '0') > MAX_CONTENT_LENGTH)
    console.error('request can be rejected because it\'s too big')
  done()
}

const setCorsHeader: preValidationHookHandler = (request, reply, done) => {
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Headers', 'Content-Type')
  done()
}

function handleError(reply: FastifyReply, error: Error) {
  const message = error.message
  console.error(message)
  reply.status(500).send(message)
}

function handleResponse(reply: FastifyReply, result: unknown) {
  reply.status(200)
  if (typeof result === 'number') {
    result = result.toString()
    return reply.send(result)
  }
  const response = JSON.parse(JSON.stringify(result)) as object
  if ('statusCode' in response) reply.status(response.statusCode as number)
  if ('headers' in response) reply.headers(response.headers as Record<string, string>)
  if ('body' in response) result = response.body
  if ('isBase64Encoded' in response && response.isBase64Encoded) result = Buffer.from(result as string, 'base64')
  return reply.send(result)
}

function addHandler(server: FastifyInstance, handler: Handler) {
  const serverFactory = (request: FastifyRequest, reply: FastifyReply) => emulateCoreProcess(handler, request, reply)
  server.all(`/${handler.path}`, serverFactory)
  console.log(`'${handler.functionName}' added at http://localhost:8080/${handler.path}`)
}

function addDefaultHandler(server: FastifyInstance, handlers: Handler[]) {
  const body: Record<string, string> = {}
  handlers.forEach((handler) => {
    body[handler.functionName] = `http://localhost:8080/${handler.path}`
  })
  server.all('/', () => body)
}

export function serve(handlers: Handler[]) {
  const server = fastify()
  server.register(plugin)
  server.addContentTypeParser('text/json', { parseAs: 'string' }, server.defaultTextParser)
  server.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, server.defaultTextParser)
  server.addContentTypeParser('application/json', { parseAs: 'string' }, server.defaultTextParser)
  server.addContentTypeParser('multipart/form-data', parseMultipartFormData)
  server.addHook('preValidation', preValidation)
  server.addHook('onRequest', setCorsHeader)

  handlers.forEach((handler) => { addHandler(server, handler) })
  addDefaultHandler(server, handlers)

  server.listen({ port: 8080 }, (err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    console.log(`Server listening at http://localhost:8080`)
  })
}
