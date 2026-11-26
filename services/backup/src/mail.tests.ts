import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppConfig } from './config'
import { sendMail } from './mail'

const config = { brevoApiKey: 'key', mailFrom: 'from@example.com', mailTo: 'to@example.com' } as AppConfig

describe('sendMail', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('posts the mail to Brevo', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    await sendMail(config, 'Subject', 'Text')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(init.headers).toMatchObject({ 'api-key': 'key' })
    expect(JSON.parse(init.body as string)).toEqual({
      sender: { email: 'from@example.com' },
      to: [{ email: 'to@example.com' }],
      subject: 'Subject',
      textContent: 'Text',
    })
  })

  it('logs a rejected mail instead of throwing', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad key', { status: 401 })))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(sendMail(config, 'S', 'T')).resolves.toBeUndefined()
    expect(error).toHaveBeenCalled()
  })

  it('logs a network error instead of throwing', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(sendMail(config, 'S', 'T')).resolves.toBeUndefined()
    expect(error).toHaveBeenCalled()
  })

  it('does not call Brevo in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    await sendMail(config, 'S', 'T')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
