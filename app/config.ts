export interface Config {
  APP_URL: string
  DB_CONNECTION_STRING: string
  CLIENT_ID: string
  COOKIE_NAME: string
  SESSION_PASSWORD: string
  ISSUER: string
  CLIENT_SECRET: string
  ADMIN_EMAIL: string
}

if (!process.env.APP_URL) throw new Error('APP_URL is not defined in environment variables')
if (!process.env.DB_CONNECTION_STRING) throw new Error('DB_CONNECTION_STRING is not defined in environment variables')
if (!process.env.CLIENT_ID) throw new Error('CLIENT_ID is not defined in environment variables')
if (!process.env.COOKIE_NAME) throw new Error('COOKIE_NAME is not defined in environment variables')
if (!process.env.SESSION_PASSWORD) throw new Error('SESSION_PASSWORD is not defined in environment variables')
if (!process.env.ISSUER) throw new Error('ISSUER is not defined in environment variables')
if (!process.env.CLIENT_SECRET) throw new Error('CLIENT_SECRET is not defined in environment variables')
if (!process.env.ADMIN_EMAIL) throw new Error('ADMIN_EMAIL is not defined in environment variables')

export const config: Config = {
  APP_URL: process.env.APP_URL,
  DB_CONNECTION_STRING: process.env.DB_CONNECTION_STRING,
  CLIENT_ID: process.env.CLIENT_ID,
  COOKIE_NAME: process.env.COOKIE_NAME,
  SESSION_PASSWORD: process.env.SESSION_PASSWORD,
  ISSUER: process.env.ISSUER,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
}
