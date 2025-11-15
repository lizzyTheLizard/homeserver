export function handler(event: Record<string, unknown>, context: Record<string, unknown>, cb: ((error: Error | undefined, result: unknown) => void)) {
  if (event.httpMethod === 'POST' && event.path === '/coeditor/discussions') {
    console.log('Creating new discussion', event.body)
    cb(undefined, {
      body: JSON.stringify({ id: 'discussion123', text: 'Initial Text from backend' }),
      headers: { 'Content-Type': ['application/json'] },
      statusCode: 201,
    })
  }

  if (event.httpMethod === 'GET' && event.path === '/api/coeditor/templates/mine') {
    console.log('Fetching user templates')
    cb(undefined, {
      body: JSON.stringify([
        { id: 'template123', name: 'Template 1', language: 'en', parameters: [] },
        { id: 'template456', name: 'Template 2', language: 'de', parameters: [{ name: 'param1', type: 'STRING', startPosition: 0, endPosition: 8 }] },
      ]),
      headers: { 'Content-Type': ['application/json'] },
      statusCode: 200,
    })
  }

  console.log('Unhandled request', event.httpMethod, event.path)
  console.log('Event details:', JSON.stringify(event))
  cb(undefined, {
    body: JSON.stringify({ message: 'Not Found' }),
    headers: { 'Content-Type': ['application/json'] },
    statusCode: 404,
  })
};

/* This is used to test locally and will not be executed on Scaleway Functions */
if (process.env.NODE_ENV === 'test') {
  import('@scaleway/serverless-functions')
    .then((scw_fnc_node) => { scw_fnc_node.serveHandler(handler, 8080) })
    .catch((err: unknown) => { console.error('Error starting server:', err) })
}
