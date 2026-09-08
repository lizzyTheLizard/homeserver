import { execFileSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'
import { adminAuth, stack } from './stack'
import { dnsAnswerCount, httpsStatus, pollUntil, tcpConnect } from './helpers'

// Plain HTTP/TLS/DNS/TCP checks against the running stack. Every check is its
// own test so a broken service fails clearly and independently of the others.

describe('stack-smoke: infrastructure services', () => {
  test('SSH (port 2222) accepts TCP connections', async () => {
    const open = await pollUntil(
      () => tcpConnect('127.0.0.1', stack.sshPort).then(() => true),
      ok => ok,
      'SSH service (dev-machine) accepts TCP connections on port 2222',
      90_000,
    )
    expect(open).toBe(true)
  })

  test('bind9 DNS answers queries for gutschi.site', async () => {
    const answers = await pollUntil(
      () => dnsAnswerCount('dev.gutschi.site', stack.dnsServer, stack.dnsPort),
      count => count >= 1,
      'bind9 DNS service answers queries for dev.gutschi.site',
      90_000,
    )
    expect(answers, 'bind9 DNS service is down or not answering').toBeGreaterThanOrEqual(1)
  })

  test('Dozzle serves its UI over HTTPS', async () => {
    const status = await pollUntil(
      () => httpsStatus(stack.logsUrl, { auth: adminAuth }),
      code => code === 200,
      `Dozzle UI (${stack.logsUrl}) serves HTTP 200 over HTTPS`,
      150_000,
    )
    expect(status, `Dozzle UI (${stack.logsUrl}) is down`).toBe(200)
  })

  test('Pgweb serves its UI over HTTPS', async () => {
    const url = `${stack.appUrl.replace('https://', 'https://')}:8443/`
    const status = await pollUntil(
      () => httpsStatus(url, { auth: adminAuth }),
      code => code === 200,
      `Pgweb UI (${url}) serves HTTP 200 over HTTPS`,
      150_000,
    )
    expect(status, `Pgweb UI (${url}) is down`).toBe(200)
  })

  test('application container is healthy', async () => {
    const health = await pollUntil(
      () => Promise.resolve(execFileSync('docker', ['inspect', '-f', '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}', 'Application'], { encoding: 'utf8' }).trim()),
      value => value === 'healthy',
      'application container (Application) reports a healthy docker healthcheck',
      150_000,
    )
    expect(health, 'application container (Application) is not healthy').toBe('healthy')
  })

  test('application /shared/ping responds 200 through nginx', async () => {
    const status = await pollUntil(
      () => httpsStatus(`${stack.appUrl}/shared/ping`),
      code => code === 200,
      `application /shared/ping (${stack.appUrl}/shared/ping) responds 200 through nginx`,
      90_000,
    )
    expect(status, 'application /shared/ping is not reachable through nginx').toBe(200)
  })

  test('application root is reachable over HTTPS through nginx', async () => {
    // Unauthenticated root redirects to the OIDC provider; any of these proves
    // nginx + the app answered instead of erroring out.
    const allowed = [200, 301, 302, 307, 308]
    const status = await pollUntil(
      () => httpsStatus(stack.appUrl),
      code => allowed.includes(code),
      `application root (${stack.appUrl}) answers through nginx over HTTPS`,
      90_000,
    )
    expect(allowed, `application root (${stack.appUrl}) did not answer through nginx (status ${String(status)})`).toContain(status)
  })
})
