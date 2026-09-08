#!/usr/bin/env node
// Mock OIDC provider for the smoke-test stack, built on the maintained
// oidc-provider library (MIT, https://github.com/panva/oidc-provider) instead
// of a hand-rolled server.
//
// Why the HTTPS + cert dance: the app's openid-client refuses plain-HTTP
// discovery, so the provider serves HTTPS with a self-signed certificate
// generated at startup (openssl ships in node:alpine).
//
// Login auto-approves without a UI: when oidc-provider needs an interaction it
// redirects to /interaction/:uid (its default interaction URL); this server
// finishes that interaction immediately with the fixed smoke-test account, so
// browser flows bounce straight back to the app's callback. The consent prompt
// is resolved by creating a grant covering every requested scope (same as
// oidc-provider's own dev interaction flow).
//
// Environment (identical interface to the hand-rolled server it replaced):
//   PORT, HEALTH_PORT, ISSUER, CLIENT_ID, CLIENT_SECRET, USER_EMAIL, USER_NAME

import { Provider, interactionPolicy } from 'oidc-provider'
import { createServer as createHttpsServer } from 'node:https'
import { createServer as createHttpServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = Number(process.env.PORT ?? 8080)
const HEALTH_PORT = Number(process.env.HEALTH_PORT ?? 8081)
const ISSUER = process.env.ISSUER ?? `https://mock-oidc-server:${PORT}`
const CLIENT_ID = process.env.CLIENT_ID ?? 'smoke-test-client'
const CLIENT_SECRET = process.env.CLIENT_SECRET ?? 'smoke-test-client-secret'
const REDIRECT_URI = process.env.REDIRECT_URI ?? 'https://www.gutschi.site/shared/auth/callback'
const USER_EMAIL = process.env.USER_EMAIL ?? 'smoke-test@example.com'
const USER_NAME = process.env.USER_NAME ?? 'Smoke Test'
const [GIVEN_NAME, ...FAMILY_REST] = USER_NAME.trim().split(/\s+/)
const FAMILY_NAME = FAMILY_REST.join(' ')

const { key, cert } = generateCertificate()

// The app always sends prompt=select_account. oidc-provider's default
// interaction policy only knows login/consent, so register it (requestable, so
// authorize accepts it) and resolve it in finishInteraction below like the
// other prompts: this provider always auto-logs the fixed account in.
const policy = interactionPolicy.base()
policy.add(new interactionPolicy.Prompt({ name: 'select_account', requestable: true }))

const provider = new Provider(ISSUER, {
  // The one fixed "account" of the smoke stack (must live in the configuration
  // in oidc-provider v9; instance assignment is ignored and the default model
  // only ever returns the sub claim).
  findAccount: async (_ctx, sub) => ({
    accountId: sub,
    async claims() {
      return {
        sub,
        email: USER_EMAIL,
        email_verified: true,
        name: USER_NAME,
        given_name: GIVEN_NAME,
        ...(FAMILY_NAME ? { family_name: FAMILY_NAME } : {}),
        preferred_username: USER_EMAIL.split('@')[0],
      }
    },
  }),
  clients: [
    {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: 'client_secret_basic',
    },
  ],
  // The app reads email/given_name from the ID token (like Azure AD), so do not
  // apply OIDC-conformance claim stripping (which limits id_token to openid
  // scope claims when userinfo is enabled).
  conformIdTokenClaims: false,
  // Scope -> claims mapping so email/profile claims survive into the ID token
  // (scope values must be objects of claim -> null, not arrays).
  claims: {
    email: { email: null, email_verified: null },
    profile: { name: null, given_name: null, family_name: null, preferred_username: null },
  },
  features: {
    // No interactive login UI: every interaction is auto-approved below.
    devInteractions: { enabled: false },
  },
  interactions: {
    policy,
  },
  cookies: {
    keys: [randomBytes(32).toString('hex')],
  },
})

// Auto-approve the pending interaction: log the smoke-test account in and
// resolve the consent prompt by creating a grant for every scope the request
// asked for (mirrors oidc-provider's built-in dev interaction flow).
async function finishInteraction(req, res) {
  try {
    const { prompt, params, session, grantId } = await provider.interactionDetails(req, res)

    const result = {
      login: { accountId: USER_EMAIL },
      select_account: {},
    }

    if (prompt && prompt.name === 'consent') {
      const { details } = prompt
      let grant
      if (grantId) {
        grant = await provider.Grant.find(grantId)
      }
      else {
        grant = new provider.Grant({
          accountId: session.accountId,
          clientId: params.client_id,
        })
      }
      if (details.missingOIDCScope) {
        grant.addOIDCScope(details.missingOIDCScope.join(' '))
      }
      if (details.missingOIDCClaims) {
        grant.addOIDCClaims(details.missingOIDCClaims)
      }
      if (details.missingResourceScopes) {
        for (const [indicator, scopes] of Object.entries(details.missingResourceScopes)) {
          grant.addResourceScope(indicator, scopes.join(' '))
        }
      }
      if (details.rar) {
        for (const detail of details.rar) {
          grant.addRar(detail)
        }
      }
      result.consent = { grantId: await grant.save() }
    }

    await provider.interactionFinished(req, res, result)
  }
  catch (error) {
    if (!res.headersSent) {
      res.statusCode = 400
      res.setHeader('content-type', 'text/plain; charset=utf-8')
      res.end(`interaction failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    else {
      res.end()
    }
  }
}

function handleRequest(req, res) {
  const { pathname } = new URL(req.url ?? '/', 'https://localhost')
  if (pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end('{"status":"ok"}')
    return
  }
  // Auto-approve an interaction: /interaction/<uid> only. The follow-up
  // /interaction/<uid>/resume (after interactionFinished) continues the
  // authorize request and belongs to oidc-provider below.
  if (/^\/interaction\/[^/]+$/.test(pathname)) {
    void finishInteraction(req, res)
    return
  }
  // Everything else (discovery, authorize, token, jwks, ...) is oidc-provider.
  // Its koa app handles its own errors (500 responses + log).
  providerCallback(req, res)
}

// provider.callback() is a factory returning the request listener.
const providerCallback = provider.callback()

createHttpsServer({ key: readFileSync(key), cert: readFileSync(cert) }, handleRequest).listen(PORT, () => {
  console.log(`[mock-oidc] HTTPS issuer ready at ${ISSUER} (port ${PORT})`)
})

// Plain-HTTP health listener used by the compose healthcheck inside the stack.
createHttpServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end('{"status":"ok"}')
}).listen(HEALTH_PORT, () => {
  console.log(`[mock-oidc] HTTP health on port ${HEALTH_PORT}`)
})

// ---------------------------------------------------------------------------

function generateCertificate() {
  const dir = mkdtempSync(join(tmpdir(), 'mock-oidc-certs-'))
  const key = join(dir, 'key.pem')
  const cert = join(dir, 'cert.pem')
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', cert, '-days', '30',
    '-subj', '/CN=mock-oidc-server',
    '-addext', 'subjectAltName=DNS:mock-oidc-server,DNS:localhost,IP:127.0.0.1',
  ], { stdio: 'ignore' })
  return { key, cert }
}
