export interface AppConfig {
  dbConnectionString: string
  backupDir: string
  retentionDays: number
  schedule: string
  microsoftGraphApplicationId: string
  onedriveRefreshToken: string
  onedriveBackupFolder: string
  brevoApiKey: string
  mailFrom: string
  mailTo: string
  mailOnSuccess: boolean
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
    brevoApiKey: required('BREVO_API_KEY', 'never-sends-in-dev'),
    mailFrom: required('MAIL_FROM', 'backup@example.com'),
    mailTo: process.env.BACKUP_MAIL_TO || 'matthias.graf@gutschi.site',
    mailOnSuccess: parseSwitch(process.env.BACKUP_MAIL_ON_SUCCESS, true),
  }
}

// 'false', '0', 'no' and 'off' switch off; unset or empty keeps the default
export function parseSwitch(value: string | undefined, defaultValue: boolean): boolean {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return defaultValue
  return !['false', '0', 'no', 'off'].includes(normalized)
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
