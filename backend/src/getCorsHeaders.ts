import { Config } from './Config.js'

export function getCorsHeaders(): Record<string, string> {
  if (!Config.corsAllowedOrigin) return {}
  return {
    'Access-Control-Allow-Origin': Config.corsAllowedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PUT,DELETE',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
  }
}
