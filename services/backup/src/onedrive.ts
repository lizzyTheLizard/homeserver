import { Client, OneDriveLargeFileUploadTask, StreamUpload } from '@microsoft/microsoft-graph-client'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import type { AppConfig } from './config'

// The app registration is for personal Microsoft accounts only, so the /consumers tenant endpoint is used (the /common endpoint rejects it with AADSTS9002346)
const TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token'
const SCOPE = 'https://graph.microsoft.com/Files.ReadWrite offline_access'

// Uploads a file to the configured folder of a personal OneDrive and replaces a file of the same name
export async function uploadToOneDrive(file: string, config: AppConfig): Promise<void> {
  const accessToken = await getAccessToken(config)
  const client = Client.init({ authProvider: done => done(null, accessToken) })
  const fileName = path.basename(file)
  const folder = config.onedriveBackupFolder.replaceAll(/^\/+|\/+$/g, '')

  const content = new StreamUpload(createReadStream(file), fileName, (await stat(file)).size)
  const task = await OneDriveLargeFileUploadTask.createTaskWithFileObject(client, content, { fileName, path: `/${folder}`, conflictBehavior: 'replace' })
  await task.upload()
}

// The Graph client does not refresh tokens, so the access token is requested with the refresh token
async function getAccessToken(config: AppConfig): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.microsoftGraphApplicationId,
    scope: SCOPE,
    grant_type: 'refresh_token',
    refresh_token: config.onedriveRefreshToken,
  })

  const response = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!response.ok) throw new Error(`Token request failed (${response.status}): ${await response.text()}`)
  const json: unknown = await response.json()
  const accessToken = stringField(json, 'access_token')
  if (!accessToken) throw new Error('Token response did not contain an access_token')
  const refreshToken = stringField(json, 'refresh_token')
  if (refreshToken) console.info(`New refresh token issued - update ONEDRIVE_REFRESH_TOKEN with: ${refreshToken}`)
  return accessToken
}

function stringField(json: unknown, name: string): string | undefined {
  const value = typeof json === 'object' && json !== null ? Object.getOwnPropertyDescriptor(json, name)?.value : undefined
  return typeof value === 'string' ? value : undefined
}
