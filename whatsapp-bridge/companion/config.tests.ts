import { afterEach, describe, expect, test, vi } from 'vitest'

const TIMEOUT_ENV = 'WHATSAPP_CMD_TIMEOUT_MS'

describe('config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('defaults the short command timeout to 5000ms', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv(TIMEOUT_ENV, '')
    await expect(loadTimeout()).resolves.toBe(5000)
  })

  test('uses the configured short command timeout', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv(TIMEOUT_ENV, '12000')
    await expect(loadTimeout()).resolves.toBe(12000)
  })
})

// config.ts reads the environment once at import time, so the module registry
// has to be reset for a stubbed value to take effect.
async function loadTimeout(): Promise<number> {
  vi.resetModules()
  const { config } = await import('./config')
  return config.WHATSAPP_CMD_TIMEOUT_MS
}
