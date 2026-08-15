#!/usr/bin/env node
// One-time helper to obtain a personal OneDrive refresh token.
//
// Runs the Microsoft identity device-code flow against a personal Microsoft
// account, prints the resulting ONEDRIVE_REFRESH_TOKEN to save in your .env.
// The app registration must allow "Accounts in any organizational directory
// and personal Microsoft accounts" with delegated Files.ReadWrite + offline_access.
//
// Usage: node get-onedrive-token.mjs

import process from 'node:process'

const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const DEVICECODE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/devicecode'
const SCOPE = 'https://graph.microsoft.com/Files.ReadWrite offline_access'

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

async function requestDeviceCode(clientId) {
  const response = await fetch(DEVICECODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, scope: SCOPE }),
  })
  if (!response.ok) throw new Error(`Device code request failed (${response.status}): ${await response.text()}`)
  return response.json()
}

async function pollForToken(clientId, deviceCode, interval, expiresIn) {
  const deadline = Date.now() + expiresIn * 1000
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'device_code',
    device_code: deviceCode,
  })
  const clientSecret = process.env.MICROSOFT_GRAPH_CLIENT_SECRET
  if (clientSecret) body.set('client_secret', clientSecret)

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000))
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const json = await response.json()
    if (response.ok) return json
    if (json.error === 'authorization_pending') continue
    throw new Error(`Token request failed (${json.error}): ${json.error_description ?? ''}`)
  }
  throw new Error('Device code authorization timed out')
}

async function main() {
  const clientId = requiredEnv('MICROSOFT_GRAPH_APPLICATION_ID')
  const deviceCode = await requestDeviceCode(clientId)
  console.log(`\n${deviceCode.message}\n`)
  const token = await pollForToken(clientId, deviceCode.device_code, deviceCode.interval, deviceCode.expires_in)
  if (!token.refresh_token) throw new Error('Token response did not contain a refresh_token')
  console.log('Authorization complete. Save this as ONEDRIVE_REFRESH_TOKEN in your .env:\n')
  console.log(token.refresh_token)
}

main().catch((error) => {
  console.error('Failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
