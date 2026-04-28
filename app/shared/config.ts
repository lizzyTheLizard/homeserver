import 'dotenv/config'

export interface Config {
  NODE_ENV: 'development' | 'production' | 'test'
  LOG_LEVEL: string
  APP_URL: string
  DB_CONNECTION_STRING: string
  ADMIN_EMAIL: string
  GRAFANA_URL?: string
  WEATHER_API_LOCATION?: string
  WEATHER_DETAIL_URL?: string
  OIDC: {
    ISSUER: string
    CLIENT_ID: string
    CLIENT_SECRET: string
  }
  SESSION: {
    COOKIE_NAME: string
    SESSION_PASSWORD: string
  }
  AI: {
    BASE_URL: string
    API_KEY: string
    MODEL: string
  }
  LOCALE: string
  CURRENCY: string
  GIT_COMMIT_HASH: string
  GIT_BRANCH: string
  GITHUB_RUN_ID?: string
  BUILD_TIME: string
}

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
const isLocalDevWithoutEnvFile = Object.keys(process.env).length === 0
const allowDefaults = isDev || isTest || isBuild

function required(name: string, devDefault?: string): string {
  const value = process.env[name]
  if (value && value.length > 0) return value
  if (allowDefaults && devDefault !== undefined) return devDefault
  if (isLocalDevWithoutEnvFile) return ''
  throw new Error(`Missing required environment variable: ${name} in ${process.env.NODE_ENV} mode`)
}

function optional(name: string, defaultValue: string): string {
  const value = process.env[name]
  return value && value.length > 0 ? value : defaultValue
}

export const config: Config = {
  NODE_ENV: required('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  LOG_LEVEL: optional('LOG_LEVEL', isDev ? 'debug' : 'info'),
  APP_URL: required('APP_URL', 'http://localhost:3000'),
  DB_CONNECTION_STRING: required('DB_CONNECTION_STRING'),
  ADMIN_EMAIL: required('ADMIN_EMAIL', 'admin@example.com'),
  WEATHER_API_LOCATION: required('WEATHER_API_LOCATION'),
  WEATHER_DETAIL_URL: required('WEATHER_DETAIL_URL'),
  GRAFANA_URL: optional('GRAFANA_URL', 'https://0e73b082-b389-4c17-9bc1-62b013f1f0d1.dashboard.cockpit.scaleway.com/d/3c11436f-6c62-4303-b951-9337fa444515/cockpit-home-copy?orgId=1&from=now-24h&to=now&timezone=browser&var-metrics=cf48grbvnjqioc&var-Filters=message%7C%3D%7C%5B2026-01-09T21:00:26.687Z%5D%20info:%20Unauthenticated%20access%20from%20user%20agent%20%27Mozilla%2F5.0%20%28Windows%20NT%206.1;%20WOW64%29%20AppleWebKit%2F537.36%20%28KHTML__gfc__%20like%20Gecko%29%20Chrome%2F45.0.2454.85%20Safari%2F537.36%27&var-container_name=gutschisitewsdlddur-test-gutschi-site&var-log_filter=&viewPanel=panel-1'),
  AI: {
    BASE_URL: optional('AI_BASE_URL', 'https://api.scaleway.ai/0e73b082-b389-4c17-9bc1-62b013f1f0d1/v1'),
    API_KEY: required('OPENAI_API_KEY', 'dev-only-key'),
    MODEL: optional('AI_MODEL', 'mistral-small-3.2-24b-instruct-2506'),
  },
  OIDC: {
    CLIENT_ID: required('CLIENT_ID', 'coeditor-client'),
    ISSUER: required('ISSUER', 'http://localhost:3000'),
    CLIENT_SECRET: required('CLIENT_SECRET', 'dev-only-client-secret'),
  },
  SESSION: {
    COOKIE_NAME: required('COOKIE_NAME', 'coeditor-session'),
    SESSION_PASSWORD: required('SESSION_PASSWORD', 'dev-only-session-password-must-be-32-chars-long'),
  },
  LOCALE: optional('LOCALE', 'de-CH'),
  CURRENCY: optional('CURRENCY', 'CHF'),
  GIT_BRANCH: required('GIT_BRANCH', 'DEVELOPMENT'),
  GIT_COMMIT_HASH: required('GIT_COMMIT_HASH', 'DEVELOPMENT'),
  GITHUB_RUN_ID: process.env.GITHUB_RUN_ID, // not required, no default
  BUILD_TIME: required('BUILD_TIME', new Date().toISOString()),
}
