import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import winston from 'winston'
import { File, Console } from 'winston/lib/winston/transports'

function getLogFilePath(): string {
  const filename = fileURLToPath(import.meta.url)
  const currentDir = dirname(filename)
  return path.join(currentDir, '../../logs', 'app.log')
}

function createLogger(logFile: string) {
  ensureLogDirectoryExists(logFile)
  return winston.createLogger({
    level: 'debug',
    transports: [
      new File({
        handleExceptions: true,
        handleRejections: true,
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.timestamp(),
          winston.format.json()),
        filename: logFilePath,
      }),
      new Console({
        handleExceptions: true,
        handleRejections: true,
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.colorize({ all: true }),
          process.env.NODE_ENV === 'development'
            ? winston.format.printf(info => toConsoleString(info))
            : winston.format.json(),
        ),
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
