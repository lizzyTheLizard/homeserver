import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { Browser, BrowserContext, chromium } from 'playwright'
import { stack } from './stack'

// Authenticated page checks via headless Chromium. The greeting and the
// WhatsApp QR code are client components rendered only after the browser has a
// session (iron-session cookie) and the assistant / bridge answer over
// WebSocket, so they cannot be asserted from static HTML. Locator waits below
// double as the retry/backoff for WebSocket-dependent content.

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  browser = await chromium.launch({ headless: true })
  context = await browser.newContext({ ignoreHTTPSErrors: true })
})

afterAll(async () => {
  await context.close()
  await browser.close()
})

async function login(page: import('playwright').Page): Promise<void> {
  // Unauthenticated "/" -> 302 to the mock authorize endpoint -> 302 back to
  // /shared/auth/callback with code+state -> session cookie -> redirect to "/".
  await page.goto(stack.appUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForURL(
    url => url.origin === new URL(stack.appUrl).origin && url.pathname === '/',
    { timeout: 60_000 },
  )
}

describe('stack-smoke: authenticated pages (browser)', () => {
  test('main page shows the assistant greeting with the assistant exercised', async () => {
    const page = await context.newPage()
    try {
      await login(page)
      // The assistant streams an initial message starting with "Good morning/
      // afternoon/evening!" over the WebSocket once initialized (~30s worst
      // case while the Microsoft parts degrade gracefully).
      const greeting = page.getByText(/Good (morning|afternoon|evening)/i)
      await greeting.waitFor({ state: 'visible', timeout: 180_000 })
      expect(await greeting.textContent()).toMatch(/Good (morning|afternoon|evening)/i)
    }
    finally {
      await page.close()
    }
  }, 300_000)

  test('whatsapp page renders a QR code region', async () => {
    const page = await context.newPage()
    try {
      await login(page)
      await page.goto(`${stack.appUrl}/startpage/whatsapp`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      // Unpaired bridge -> WhatsAppContent shows the pairing screen with a
      // 300px react-qr-code SVG.
      await page.getByRole('heading', { name: 'Scan QR Code with WhatsApp' })
        .waitFor({ state: 'visible', timeout: 120_000 })
      const qr = page.locator('svg[height="300"]')
      await qr.waitFor({ state: 'visible', timeout: 30_000 })
      expect(await qr.count()).toBeGreaterThanOrEqual(1)
    }
    finally {
      await page.close()
    }
  }, 300_000)
})
