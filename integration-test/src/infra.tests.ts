import { execFileSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'
import { adminAuth, stack } from './stack'
import { dnsAnswerCount, httpsStatus, tcpConnect } from './helpers'

// Plain HTTP/TLS/DNS/TCP checks against the running stack. Every check is its
// own test so a broken service fails clearly and independently of the others.
// These run AFTER the orchestrator has brought the stack up and polled basic
// readiness; they assert the acceptance-criteria behaviour.

describe('stack-smoke: infrastructure services', () => {
  test('SSH (port 2222) accepts TCP connections', async () => {
    try {
      await tcpConnect('127.0.0.1', stack.sshPort)
    }
    catch (error) {
      throw new Error(`SSH service (dev-machine) is down: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }
  }, 30_000)

  test('bind9 DNS answers queries for gutschi.site', async () => {
    const answers = await dnsAnswerCount('dev.gutschi.site', stack.dnsServer, stack.dnsPort)
    expect(answers, 'bind9 DNS service is down or not answering').toBeGreaterThanOrEqual(1)
  }, 30_000)

  test('Dozzle serves its UI over HTTPS', async () => {
    const status = await httpsStatus(stack.logsUrl, { auth: adminAuth })
    expect(status, `Dozzle UI (${stack.logsUrl}) is down`).toBe(200)
  }, 60_000)

  test('Pgweb serves its UI over HTTPS', async () => {
    const url = `${stack.appUrl.replace('https://', 'https://')}:8443/`
    const status = await httpsStatus(url, { auth: adminAuth })
    expect(status, `Pgweb UI (${url}) is down`).toBe(200)
  }, 60_000)

  test('application container is healthy', () => {
    let health: string
    try {
      health = execFileSync('docker', ['inspect', '-f', '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}', 'Application'], { encoding: 'utf8' }).trim()
    }
    catch (error) {
      throw new Error(`docker CLI unavailable or container "Application" not found - cannot verify app health: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }
    expect(health, 'application container (Application) is not healthy').toBe('healthy')
  }, 30_000)

  test('application /shared/ping responds 200 through nginx', async () => {
    const status = await httpsStatus(`${stack.appUrl}/shared/ping`)
    expect(status, 'application /shared/ping is not reachable through nginx').toBe(200)
  }, 30_000)

  test('application root is reachable over HTTPS through nginx', async () => {
    const status = await httpsStatus(stack.appUrl)
    // Unauthenticated root redirects to the OIDC provider; any of these proves
    // nginx + the app answered instead of erroring out.
    expect([200, 301, 302, 307, 308], `application root (${stack.appUrl}) did not answer through nginx (status ${String(status)})`).toContain(status)
  }, 30_000)
})
