import winston from 'winston'
import { Console } from 'winston/lib/winston/transports'
import { config } from './config'

function createLogger() {
  const isDev = config.NODE_ENV === 'development'
  const format = isDev
    ? winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp({ format: 'MM-DD-YYYY HH:mm:ss' }),
        winston.format.printf(info => toConsoleString(info)),
        winston.format.colorize({ all: true }),
      )
    : winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.json(),
      )
  return winston.createLogger({
    level: config.LOG_LEVEL,
    transports: [
      new Console({
        handleExceptions: true,
        handleRejections: true,
        format: format,
      }),
    ],
  })
}

function toConsoleString(info: winston.Logform.TransformableInfo) {
  let message = `${info.timestamp as string} ${info.level}: ${info.message as string}`
  if (info.stack) message = message + '\n' + (info.stack as string)
  return message
}

export const logger = createLogger()
