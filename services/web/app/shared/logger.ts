import { Console } from 'winston/lib/winston/transports'
import { config } from './config'
import winston from 'winston'

function createLogger() {
  const isDev = config.NODE_ENV === 'development',
   format = isDev
    ? winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp({ format: 'DD.MM.YYYY HH:mm:ss.SSS' }),
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
        format,
        handleExceptions: true,
        handleRejections: true,
      }),
    ],
  })
}

function toConsoleString(info: winston.Logform.TransformableInfo) {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  let message = `${info.timestamp as string} ${info.level}: ${info.message as string}`
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  if (info.stack) {message = `${message  }\n${  info.stack as string}`}
  return message
}

export const logger = createLogger()
