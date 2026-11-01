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
    dbConnectionString: required('DB_CONNECTION_STRING'),
    sessionSecret: required('SESSION_SECRET'),
    adminUser: required('ADMIN_USER'),
    adminPassword: required('ADMIN_PASSWORD'),
  }
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}
