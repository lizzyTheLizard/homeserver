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

export const config: Config = {
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  DB_CONNECTION_STRING: process.env.DB_CONNECTION_STRING ?? 'sqlite://./dev.db',
  CLIENT_ID: process.env.CLIENT_ID ?? 'coeditor-client',
  COOKIE_NAME: process.env.COOKIE_NAME ?? 'coeditor-session',
  SESSION_PASSWORD: process.env.SESSION_PASSWORD ?? 'a-very-secure-password-that-should-be-changed',
  ISSUER: process.env.ISSUER ?? 'http://localhost:3000',
  CLIENT_SECRET: process.env.CLIENT_SECRET ?? 'a-very-secure-client-secret-that-should-be-changed',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? 'admin@example.com',
}
