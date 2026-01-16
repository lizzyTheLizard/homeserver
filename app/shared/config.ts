export interface Config {
  APP_URL: string
  DB_CONNECTION_STRING: string
  ADMIN_EMAIL: string
  OIDC: {
    ISSUER: string
    CLIENT_ID: string
    CLIENT_SECRET: string
  }
  SESSION: {
    COOKIE_NAME: string
    SESSION_PASSWORD: string
  }
  AI: {
    BASE_URL: string
    API_KEY: string
    MODEL: string
  }
}

export const config: Config = {
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  DB_CONNECTION_STRING: process.env.DB_CONNECTION_STRING ?? 'sqlite://./dev.db',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? 'admin@example.com',
  AI: {
    BASE_URL: 'https://api.scaleway.ai/0e73b082-b389-4c17-9bc1-62b013f1f0d1/v1',
    API_KEY: process.env.OPENAI_API_KEY ?? '',
    MODEL: 'gpt-oss-120b',
  },
  OIDC: {
    CLIENT_ID: process.env.CLIENT_ID ?? 'coeditor-client',
    ISSUER: process.env.ISSUER ?? 'http://localhost:3000',
    CLIENT_SECRET: process.env.CLIENT_SECRET ?? 'a-very-secure-client-secret-that-should-be-changed',
  },
  SESSION: {
    COOKIE_NAME: process.env.COOKIE_NAME ?? 'coeditor-session',
    SESSION_PASSWORD: process.env.SESSION_PASSWORD ?? 'a-very-secure-password-that-should-be-changed',
  },
}
