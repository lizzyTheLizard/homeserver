import winston from 'winston'
import { Console } from 'winston/lib/winston/transports'

function createLogger() {
  const format = process.env.NODE_ENV === 'development'
    ? winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.colorize({ all: true }),
        winston.format.printf(info => toConsoleString(info)),
      )
    : winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.json(),
      )
  return winston.createLogger({
    level: 'debug',
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
  let message = `${info.level}: ${info.message as string}`
  if (info.stack) message = message + '\n' + (info.stack as string)
  return message
}

export const logger = createLogger()

console.log = () => { /* empty */ }
console.error = () => { /* empty */ }
console.warn = () => { /* empty */ }
console.info = () => { /* empty */ }
console.debug = () => { /* empty */ }
