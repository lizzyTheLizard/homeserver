export function startDiscussion(event: Record<string, unknown>, context: Record<string, unknown>, cb: unknown) {
  console.log('Function invoked with event:', event, 'and context:', context, 'and callback:', cb)
  return {
    body: 'Hello world!',
    headers: { 'Content-Type': ['application/json'] },
    statusCode: 200,
  }
};
