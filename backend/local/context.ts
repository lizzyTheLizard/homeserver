import { Handler } from './serving'

export function formatContext(handler: Handler): Record<string, unknown> {
  return {
    memoryLimitInMb: 128,
    functionName: handler.functionName,
    functionVersion: '',
  }
}
