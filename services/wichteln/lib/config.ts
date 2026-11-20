interface AppConfig {
  dbConnectionString: string
  sessionSecret: string
  adminUser: string
  adminPassword: string
}

/**
 * Reads the required runtime configuration from the environment. Every value
 * is mandatory: the app fails closed instead of starting with a default.
 */
export function getConfig(): AppConfig {
  return {
    adminPassword: required('ADMIN_PASSWORD'),
    adminUser: required('ADMIN_USER'),
    dbConnectionString: required('DB_CONNECTION_STRING'),
    sessionSecret: required('SESSION_SECRET'),
  }
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}
