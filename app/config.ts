export type Config = Record<string, { value: string, confidential: boolean }>

/* eslint-disable @typescript-eslint/no-non-null-assertion */
export const config: Config = {
  database: { value: process.env.DB_CONNECTION_STRING!, confidential: true },
  clientId: { value: process.env.CLIENT_ID!, confidential: true },
  clientSecret: { value: process.env.CLIENT_SECRET!, confidential: true },
  redirectUri: { value: `${process.env.APP_URL!}/common/auth/callback`, confidential: false },
  scope: { value: 'openid profile email', confidential: false },
  issuer: { value: process.env.ISSUER!, confidential: false },
  appUrl: { value: process.env.APP_URL!, confidential: false },
  password: { value: process.env.SESSION_PASSWORD!, confidential: true },
  cookieName: { value: process.env.COOKIE_NAME!, confidential: false },
  cookieSecure: { value: process.env.NODE_ENV === 'development' ? 'false' : 'true', confidential: false },
  cookieTtl: { value: '604800', confidential: false }, // 1 week in seconds
  challenge: { value: 'S256', confidential: false },
}
