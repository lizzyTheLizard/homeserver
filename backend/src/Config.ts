export const Config = {
  corsAllowedOrigin: getAllowedOrigin(),
  tenantId: '7bd72b43-52f6-4dc6-a856-5704e0f925bd',
  audience: '00000003-0000-0000-c000-000000000000',
  applicationId: 'f79682fe-0761-4361-aa2e-317957284c3a',
  dbConnectionString: getConnectionString(),
}

function getAllowedOrigin(): string | undefined {
  const origin = process.env.CORS_ALLOWED_ORIGIN
  return origin
}

function getConnectionString(): string {
  const connectionString = process.env.DB_CONNECTION_STRING
  if (!connectionString) throw new Error('Missing required database configuration: DB_CONNECTION_STRING must be defined')
  return connectionString
}
