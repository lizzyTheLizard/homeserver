export interface Config {
  NODE_ENV: 'development' | 'production' | 'test'
  LOG_LEVEL: string
  LOG_URL: string
  APP_URL: string
  DB_CONNECTION_STRING: string
  ADMIN_EMAIL: string
  OIDC: {
    ISSUER: string
    CLIENT_ID: string
    CLIENT_SECRET: string
  }
  SESSION: {
    COOKIE_NAME: string
    SESSION_PASSWORD: string
  }
  NODE_PUBLIC_LOCALE: string
  NODE_PUBLIC_CURRENCY: string
  WHATSAPP_BRIDGE_URL: string
  ASSISTANT_INTERNAL_URL: string
  GIT_COMMIT_HASH: string
  GIT_BRANCH: string
  GITHUB_RUN_ID?: string
  BUILD_TIME: string
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
  LOG_URL: required('LOG_URL', 'http://localhost:4000'),
  APP_URL: required('APP_URL', 'http://localhost:3000'),
  DB_CONNECTION_STRING: required('DB_CONNECTION_STRING', 'postgres://homeserver:homeserver@postgresdev:5432/homeserver?sslmode=disable'),
  ADMIN_EMAIL: required('ADMIN_EMAIL', 'admin@example.com'),
  OIDC: {
    CLIENT_ID: required('CLIENT_ID', 'coeditor-client'),
    ISSUER: required('LOGIN_ISSUER', 'http://localhost:8080/realms/coeditor'),
    CLIENT_SECRET: required('CLIENT_SECRET', 'dev-only-client-secret'),
  },
  SESSION: {
    COOKIE_NAME: required('COOKIE_NAME', 'homeserver-session'),
    SESSION_PASSWORD: required('SESSION_PASSWORD', 'dev-only-session-password-must-be-32-chars-long'),
  },
  NODE_PUBLIC_LOCALE: optional('NODE_PUBLIC_LOCALE', 'de-CH'),
  NODE_PUBLIC_CURRENCY: optional('NODE_PUBLIC_CURRENCY', 'CHF'),
  WHATSAPP_BRIDGE_URL: required('WHATSAPP_BRIDGE_URL', 'http://localhost:8400'),
  ASSISTANT_INTERNAL_URL: required('ASSISTANT_INTERNAL_URL', 'http://localhost:8500'),
  GIT_BRANCH: required('GIT_BRANCH', 'DEVELOPMENT'),
  GIT_COMMIT_HASH: required('GIT_COMMIT_HASH', 'DEVELOPMENT'),
  GITHUB_RUN_ID: process.env.GITHUB_RUN_ID, // not required, no default
  BUILD_TIME: required('BUILD_TIME', new Date().toISOString()),
}
