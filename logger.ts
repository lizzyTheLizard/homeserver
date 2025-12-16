import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import winston from 'winston'

function getLogFilePath(): string {
  const filename = fileURLToPath(import.meta.url)
  const currentDir = dirname(filename)
  return path.join(currentDir, 'logs', 'app.log')
}

function createLogger(logFile: string) {
  try {
    fs.mkdirSync(dirname(logFile), { recursive: true })
    // Ensure log file exists
    if (!fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, 'Logger Started\n')
    }
    console.log('Started log:', logFile)
  }
  catch (err) {
    console.error('Failed to create log file or directory:', err)
  }
  return winston.createLogger({
    level: 'debug',
    transports: [
      new winston.transports.File({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(info => toConsoleString(info, false))),
        filename: logFilePath,
      }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(info => toConsoleString(info, true))),
      }),
    ],
  })
}

function toConsoleString(info: winston.Logform.TransformableInfo, color: boolean) {
  const message = `[${info.timestamp as string}] ${info.level}: ${info.message as string}`
  if (color) {
    return message
  }
  // eslint-disable-next-line no-control-regex
  return message.replace(/\u001b\[.*?m/g, '')
}

export const logFilePath = getLogFilePath()
export const logger = createLogger(logFilePath)
