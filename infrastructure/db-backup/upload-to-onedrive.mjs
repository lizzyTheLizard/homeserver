#!/usr/bin/env node
// Uploads a file to a PERSONAL OneDrive account via the Microsoft Graph API
// using a delegated refresh token (the device-code helper in
// get-onedrive-token.mjs prints one to save in ONEDRIVE_REFRESH_TOKEN).
// No npm dependencies - plain Node.js (>= 20) only.

import { open } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const CHUNK_SIZE = 10 * 1024 * 1024 // must be a multiple of 320 KiB
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

async function main() {
  const filePath = process.argv[2]
  if (!filePath) throw new Error('Usage: upload-to-onedrive.mjs <file>')
  const fileName = path.basename(filePath)
  const folder = (process.env.ONEDRIVE_BACKUP_FOLDER ?? 'Homeserver').replace(/^\/+|\/+$/g, '')

  const accessToken = await getAccessToken()
  const uploadUrl = await createUploadSession(accessToken, folder, fileName)
  await uploadInChunks(uploadUrl, filePath)
  console.log(`[upload] Uploaded ${fileName} to OneDrive folder '${folder}'`)
}

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: requiredEnv('MICROSOFT_GRAPH_APPLICATION_ID'),
    scope: 'https://graph.microsoft.com/Files.ReadWrite offline_access',
    grant_type: 'refresh_token',
    refresh_token: requiredEnv('ONEDRIVE_REFRESH_TOKEN'),
  })
  const clientSecret = process.env.MICROSOFT_GRAPH_CLIENT_SECRET
  if (clientSecret) body.set('client_secret', clientSecret)

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) throw new Error(`Token request failed (${response.status}): ${await response.text()}`)
  const json = await response.json()
  if (!json.access_token) throw new Error('Token response did not contain an access_token')
  if (json.refresh_token) {
    console.log(`[upload] New refresh token issued - update ONEDRIVE_REFRESH_TOKEN with: ${json.refresh_token}`)
  }
  return json.access_token
}

async function createUploadSession(accessToken, folder, fileName) {
  const itemPath = [...folder.split('/'), fileName].map(encodeURIComponent).join('/')
  const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${itemPath}:/createUploadSession`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }),
  })
  if (!response.ok) throw new Error(`Failed to create upload session (${response.status}): ${await response.text()}`)
  const json = await response.json()
  if (!json.uploadUrl) throw new Error('Upload session response did not contain an uploadUrl')
  return json.uploadUrl
}

async function uploadInChunks(uploadUrl, filePath) {
  const handle = await open(filePath, 'r')
  try {
    const { size } = await handle.stat()
    const buffer = Buffer.alloc(CHUNK_SIZE)
    let offset = 0
    while (offset < size) {
      const { bytesRead } = await handle.read(buffer, 0, Math.min(CHUNK_SIZE, size - offset), offset)
      // The upload URL is pre-authenticated - do not send an Authorization header
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': String(bytesRead),
          'Content-Range': `bytes ${offset}-${offset + bytesRead - 1}/${size}`,
        },
        body: buffer.subarray(0, bytesRead),
      })
      if (!response.ok && response.status !== 202) throw new Error(`Chunk upload failed (${response.status}): ${await response.text()}`)
      offset += bytesRead
      console.log(`[upload] ${offset}/${size} bytes`)
    }
  }
  finally {
    await handle.close()
  }
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

main().catch((error) => {
  console.error('[upload] Failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
