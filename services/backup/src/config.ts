export interface AppConfig {
  dbConnectionString: string
  backupDir: string
  retentionDays: number
  schedule: string
  microsoftGraphApplicationId: string
  onedriveRefreshToken: string
  onedriveBackupFolder: string
}

export function getConfig(): AppConfig {
  return {
    dbConnectionString: required('DB_CONNECTION_STRING'),
    backupDir: process.env.BACKUP_DIR ?? '/backup',
    retentionDays: parseDays(required('RETENTION_DAYS', '31')),
    schedule: required('BACKUP_SCHEDULE', '0 3 * * *'),
    microsoftGraphApplicationId: required('MICROSOFT_GRAPH_APPLICATION_ID', 'never-uploads-in-dev'),
    onedriveRefreshToken: required('ONEDRIVE_REFRESH_TOKEN', 'never-uploads-in-dev'),
    onedriveBackupFolder: required('ONEDRIVE_BACKUP_FOLDER', 'never-uploads-in-dev'),
  }
}

function required(name: string, devDefault?: string): string {
  const value = process.env[name]
  if (value && value.length > 0) return value
  if (process.env.NODE_ENV === 'development' && devDefault !== undefined) return devDefault
  throw new Error(`Missing required environment variable: ${name}`)
}

function parseDays(value: string): number {
  const days = Number(value)
  if (!Number.isInteger(days) || days < 0) throw new Error(`Invalid RETENTION_DAYS '${value}': expected a number of days`)

  return days
}
