import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppConfig } from './config'

const sendMail = vi.fn()
vi.mock('./mail', () => ({ sendMail: (...args: unknown[]) => sendMail(...args) as unknown }))

const { runAndReport } = await import('./report')

const config = (mailOnSuccess: boolean) => ({ mailOnSuccess }) as AppConfig

describe('runAndReport', () => {
  beforeEach(() => sendMail.mockReset())

  it('mails a success with the dump name and size', async () => {
    await runAndReport(config(true), () => Promise.resolve({ fileName: 'homeserver-prod-x.dump', size: 2 * 1024 * 1024 }))
    expect(sendMail).toHaveBeenCalledOnce()
    expect(sendMail.mock.calls[0]?.[1]).toBe('Backup succeeded')
    expect(sendMail.mock.calls[0]?.[2]).toContain('homeserver-prod-x.dump (2.0 MiB)')
  })

  it('sends no success mail when switched off', async () => {
    await runAndReport(config(false), () => Promise.resolve({ fileName: 'a', size: 1 }))
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('mails a failure and rethrows, even when the success mail is off', async () => {
    const failure = new Error('pg_dump exited with code 1')
    await expect(runAndReport(config(false), () => Promise.reject(failure))).rejects.toBe(failure)
    expect(sendMail).toHaveBeenCalledOnce()
    expect(sendMail.mock.calls[0]?.[1]).toBe('Backup FAILED')
    expect(sendMail.mock.calls[0]?.[2]).toContain('pg_dump exited with code 1')
  })
})
