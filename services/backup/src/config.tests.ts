import { afterEach, describe, expect, it, vi } from 'vitest'
import { getConfig, parseSwitch } from './config'

const REQUIRED = {
  DB_CONNECTION_STRING: 'postgres://x',
  RETENTION_DAYS: '31',
  BACKUP_SCHEDULE: '0 3 * * *',
  MICROSOFT_GRAPH_APPLICATION_ID: 'app',
  ONEDRIVE_REFRESH_TOKEN: 'token',
  ONEDRIVE_BACKUP_FOLDER: 'Homeserver',
}

describe('mail configuration', () => {
  afterEach(() => vi.unstubAllEnvs())

  function stub(env: Record<string, string>) {
    vi.stubEnv('NODE_ENV', 'production')
    for (const [key, value] of Object.entries({ MAIL_TO: '', MAIL_ON_SUCCESS: '', ...REQUIRED, ...env })) vi.stubEnv(key, value)
  }

  it('uses the defaults for recipient and success mail', () => {
    stub({ BREVO_API_KEY: 'key', MAIL_FROM: 'from@example.com' })
    const config = getConfig()
    expect(config.mailTo).toBe('matthias.graf@gutschi.site')
    expect(config.mailOnSuccess).toBe(true)
  })

  it('reads recipient and switch', () => {
    stub({ BREVO_API_KEY: 'key', MAIL_FROM: 'from@example.com', MAIL_TO: 'a@b.ch', MAIL_ON_SUCCESS: 'false' })
    const config = getConfig()
    expect(config.mailTo).toBe('a@b.ch')
    expect(config.mailOnSuccess).toBe(false)
  })

  it('fails without API key or sender outside development', () => {
    stub({ MAIL_FROM: 'from@example.com', BREVO_API_KEY: '' })
    expect(() => getConfig()).toThrow('BREVO_API_KEY')
    stub({ BREVO_API_KEY: 'key', MAIL_FROM: '' })
    expect(() => getConfig()).toThrow('MAIL_FROM')
  })

  it('parses the off values', () => {
    for (const value of ['false', '0', 'No', 'OFF']) expect(parseSwitch(value, true)).toBe(false)
    expect(parseSwitch('true', false)).toBe(true)
    expect(parseSwitch(undefined, true)).toBe(true)
    expect(parseSwitch('', false)).toBe(false)
  })
})
