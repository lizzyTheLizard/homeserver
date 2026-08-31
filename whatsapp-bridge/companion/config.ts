export interface Config {
  NODE_ENV: 'development' | 'production' | 'test'
  LOG_LEVEL: string
  PORT: number
  WHATSAPP_DATA_DIR: string
  WACLI_BIN: string
  WACLI_DEVICE_PLATFORM: string
  WACLI_DEVICE_LABEL: string
  WHATSAPP_CMD_TIMEOUT_MS: number
  WHATSAPP_CHATS_LIMIT: number
  WHATSAPP_MESSAGES_LIMIT: number
  WACLI_SYNC_MAX_MESSAGES: string
  WACLI_SYNC_MAX_DB_SIZE: string
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

function optional(name: string): string | undefined
function optional(name: string, defaultValue: string): string
function optional(name: string, defaultValue?: string): string | undefined {
  const value = process.env[name]
  return value && value.length > 0 ? value : defaultValue
}

function optionalNumber(name: string, defaultValue: number): number {
  const value = process.env[name]
  if (!value || value.length === 0) return defaultValue
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

export const config: Config = {
  NODE_ENV: required('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  LOG_LEVEL: optional('LOG_LEVEL', isDev ? 'debug' : 'info'),
  PORT: optionalNumber('PORT', 8400),
  WHATSAPP_DATA_DIR: optional('WHATSAPP_DATA_DIR', './data'),
  WACLI_BIN: optional('WACLI_BIN', 'wacli'),
  WACLI_DEVICE_PLATFORM: optional('WACLI_DEVICE_PLATFORM', 'desktop'),
  WACLI_DEVICE_LABEL: optional('WACLI_DEVICE_LABEL', isDev ? 'Gutschi.site (DEV)' : 'Gutschi.site'),
  WHATSAPP_CMD_TIMEOUT_MS: optionalNumber('WHATSAPP_CMD_TIMEOUT_MS', 30_000),
  WHATSAPP_CHATS_LIMIT: optionalNumber('WHATSAPP_CHATS_LIMIT', 1000),
  WHATSAPP_MESSAGES_LIMIT: optionalNumber('WHATSAPP_MESSAGES_LIMIT', 5_000),
  WACLI_SYNC_MAX_MESSAGES: optional('WACLI_SYNC_MAX_MESSAGES', '10000'),
  WACLI_SYNC_MAX_DB_SIZE: optional('WACLI_SYNC_MAX_DB_SIZE', '100mb'),
}
