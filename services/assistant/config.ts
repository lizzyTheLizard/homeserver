export interface Config {
  NODE_ENV: 'development' | 'production' | 'test'
  LOG_LEVEL: string
  AI: {
    API_KEY: string
    LOG_REQUEST_RESPONSE: boolean
  }
  WHATSAPP_BRIDGE_URL: string
  MICROSOFT_GRAPH: {
    APPLICATION_ID: string
    CLIENT_SECRET: string
    ISSUER: string
  }
  SESSION: {
    COOKIE_NAME: string
    SESSION_PASSWORD: string
  }
  DB_CONNECTION_STRING: string
}

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
const isStorybook = Object.keys(process.env).length === 0
const allowDefaults = isDev || isTest || isBuild || isStorybook

function required(name: string, devDefault?: string): string {
  const value = process.env[name]
  if (value && value.length > 0) return value
  if (allowDefaults && devDefault !== undefined) return devDefault
  throw new Error(`Missing required environment variable: ${name}`)
}

function optional(name: string, defaultValue: string): string {
  const value = process.env[name]
  return value && value.length > 0 ? value : defaultValue
}

export const config: Config = {
  NODE_ENV: required('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  LOG_LEVEL: optional('LOG_LEVEL', isDev ? 'debug' : 'info'),
  DB_CONNECTION_STRING: required('DB_CONNECTION_STRING', 'postgres://homeserver:homeserver@postgresdev:5432/homeserver?sslmode=disable'),
  AI: {
    API_KEY: required('AI_API_KEY', 'dev-only-key'),
    LOG_REQUEST_RESPONSE: optional('AI_LOG_REQUEST_RESPONSE', 'false').toLowerCase() === 'true',
  },
  SESSION: {
    COOKIE_NAME: required('COOKIE_NAME', 'homeserver-session'),
    SESSION_PASSWORD: required('SESSION_PASSWORD', 'dev-only-session-password-must-be-32-chars-long'),
  },
  MICROSOFT_GRAPH: {
    APPLICATION_ID: required('MICROSOFT_GRAPH_APPLICATION_ID', 'dev-only-application-id'),
    CLIENT_SECRET: required('MICROSOFT_GRAPH_CLIENT_SECRET', 'dev-only-client-secret'),
    ISSUER: required('MICROSOFT_GRAPH_ISSUER', 'https://login.microsoftonline.com/dev-only-tenant-id/v2.0'),
  },
  WHATSAPP_BRIDGE_URL: required('WHATSAPP_BRIDGE_URL', 'http://localhost:8400'),
}
