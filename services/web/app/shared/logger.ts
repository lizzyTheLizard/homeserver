import winston from 'winston'
import { Console } from 'winston/lib/winston/transports'
import { config } from './config'

function createLogger() {
  const isDev = config.NODE_ENV === 'development'
  const format = isDev
    ? winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp({ format: 'DD.MM.YYYY HH:mm:ss.SSS' }),
        winston.format.printf(info => toConsoleString(info)),
        winston.format.colorize({ all: true }),
      )
    : winston.format.combine(winston.format.errors({ stack: true }), winston.format.json())
  return winston.createLogger({
    level: config.LOG_LEVEL,
    exitOnError: shouldExitOnError,
    transports: [
      new Console({
        handleExceptions: true,
        handleRejections: true,
        format,
      }),
    ],
  })
}
// A client that closes its connection mid-request makes Node emit an `aborted` (ECONNRESET) error.
// A client that closes its connection mid-request makes Node emit an `aborted` (ECONNRESET) error
// Nobody can handle it. That is routine, not a reason to take the whole server down.
function shouldExitOnError(error: Error): boolean {
  return !('code' in error && error.code === 'ECONNRESET')
}

function toConsoleString(info: winston.Logform.TransformableInfo) {
  let message = `${String(info.timestamp)} ${info.level}: ${String(info.message)}`
  if (typeof info.stack === 'string') message = `${message}\n${info.stack}`
  return message
}

export const logger = createLogger()
