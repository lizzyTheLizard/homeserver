import winston from 'winston'
const { combine, timestamp, printf, colorize } = winston.format

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.File({
      format: combine(timestamp(), printf(info => toConsoleString(info, false))),
      filename: 'app.log',

    }),
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), printf(info => toConsoleString(info, true))),
    }),
  ],
})

function toConsoleString(info, color) {
  const message = `[${info.timestamp}] ${info.level}: ${info.message}`
  if (color) {
    return message
  }
  // eslint-disable-next-line no-control-regex
  return message.replace(/\u001b\[.*?m/g, '')
}

logger.info('Logger initialized.')
console.info = (...args) => logger.info([...args])
console.warn = (...args) => logger.warn([...args])
console.error = (...args) => logger.error([...args])
console.fatal = (...args) => logger.error([...args])
console.tracef = (...args) => logger.silly([...args])
console.debugf = (...args) => logger.debug([...args])
console.logf = (...args) => logger.info([...args])
console.infof = (...args) => logger.info([...args])
console.warnf = (...args) => logger.warn([...args])
console.errorf = (...args) => logger.error([...args])
console.fatalf = (...args) => logger.error([...args])

export { logger }
