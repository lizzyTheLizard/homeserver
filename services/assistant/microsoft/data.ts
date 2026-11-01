import { PoolClient } from 'pg'

export interface MicrosoftToken {
  access_token: string
  refresh_token: string
  expires_at: number
}

export async function getMicrosoftToken(client: PoolClient, ownerEmail: string): Promise<MicrosoftToken | undefined> {
  const result = await client.query<{ access_token: string, refresh_token: string, expires_at: number }>(
    'SELECT access_token, refresh_token, expires_at FROM microsoft_token WHERE owner_email = $1',
    [ownerEmail],
  )
  if (result.rows.length === 0) return undefined
  return { access_token: result.rows[0].access_token, refresh_token: result.rows[0].refresh_token, expires_at: result.rows[0].expires_at }
}

export async function setMicrosoftToken(client: PoolClient, ownerEmail: string, token: MicrosoftToken): Promise<void> {
  const existing = await client.query('SELECT FROM microsoft_token WHERE owner_email = $1', [ownerEmail])
  if (existing.rows.length > 0) {
    await client.query(
      'UPDATE microsoft_token SET access_token = $2, refresh_token = $3, expires_at = $4 WHERE owner_email = $1',
      [ownerEmail, token.access_token, token.refresh_token, token.expires_at],
    )
  }
  else {
    await client.query(
      'INSERT INTO microsoft_token (owner_email, access_token, refresh_token, expires_at) VALUES ($1, $2, $3, $4)',
      [ownerEmail, token.access_token, token.refresh_token, token.expires_at],
    )
  }
}

export async function deleteMicrosoftToken(client: PoolClient, ownerEmail: string): Promise<void> {
  await client.query('DELETE FROM microsoft_token WHERE owner_email = $1', [ownerEmail])
}
