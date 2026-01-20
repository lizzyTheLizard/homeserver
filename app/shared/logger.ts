import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import winston from 'winston'
import { Console } from 'winston/lib/winston/transports'

function getLogFilePath(): string {
  const filename = fileURLToPath(import.meta.url)
  const currentDir = dirname(filename)
  return path.join(currentDir, '../../logs', 'app.log')
}

function createLogger(logFile: string) {
  ensureLogDirectoryExists(logFile)
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

function ensureLogDirectoryExists(logFile: string) {
  try {
    fs.mkdirSync(dirname(logFile), { recursive: true })
    // Ensure log file exists
    if (!fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, 'Logger Started\n')
    }
  }
  catch (err) {
    console.error('Failed to create log file or directory:', err)
  }
}

function toConsoleString(info: winston.Logform.TransformableInfo) {
  let message = `${info.level}: ${info.message as string}`
  if (info.stack) message = message + '\n' + (info.stack as string)
  return message
}

export const logFilePath = getLogFilePath()
export const logger = createLogger(logFilePath)
