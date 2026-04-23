import 'dotenv/config'

export interface Config {
  APP_URL: string
  DB_CONNECTION_STRING: string
  ADMIN_EMAIL: string
  GRAFANA_URL?: string
  WEATHER_API_LOCATION?: string
  WEATHER_DETAIL_URL?: string
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
  WEATHER_API_LOCATION: process.env.WEATHER_API_LOCATION,
  WEATHER_DETAIL_URL: process.env.WEATHER_DETAIL_URL,
  GRAFANA_URL: 'https://0e73b082-b389-4c17-9bc1-62b013f1f0d1.dashboard.cockpit.scaleway.com/d/3c11436f-6c62-4303-b951-9337fa444515/cockpit-home-copy?orgId=1&from=now-24h&to=now&timezone=browser&var-metrics=cf48grbvnjqioc&var-Filters=message%7C%3D%7C%5B2026-01-09T21:00:26.687Z%5D%20info:%20Unauthenticated%20access%20from%20user%20agent%20%27Mozilla%2F5.0%20%28Windows%20NT%206.1;%20WOW64%29%20AppleWebKit%2F537.36%20%28KHTML__gfc__%20like%20Gecko%29%20Chrome%2F45.0.2454.85%20Safari%2F537.36%27&var-container_name=gutschisitewsdlddur-test-gutschi-site&var-log_filter=&viewPanel=panel-1',
  AI: {
    BASE_URL: 'https://api.scaleway.ai/0e73b082-b389-4c17-9bc1-62b013f1f0d1/v1',
    API_KEY: process.env.OPENAI_API_KEY ?? '',
    MODEL: 'mistral-small-3.2-24b-instruct-2506',
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
