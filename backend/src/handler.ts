import { serveHandler } from '@scaleway/serverless-functions'

export function handler(event: Record<string, unknown>, context: Record<string, unknown>, cb: unknown) {
  console.log('Function invoked with event:', event, 'and context:', context, 'and callback:', cb)
  return {
    body: 'Hello World!',
    headers: { 'Content-Type': ['application/json'] },
    statusCode: 200,
  }
};

/* This is used to test locally and will not be executed on Scaleway Functions */
if (process.env.NODE_ENV === 'test') {
  serveHandler(handler, 8080)
}
