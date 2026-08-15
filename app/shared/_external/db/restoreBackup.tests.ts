import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parseArgs, resolveBackupFile, resolveConnectionString } from './restoreBackup'

describe.concurrent('parseArgs', () => {
  test('parses file and target', () => {
    expect(parseArgs(['backup.dump', 'dev'])).toEqual({ file: 'backup.dump', target: 'dev', assumeYes: false })
  })

  test('parses the --yes flag and a literal -- separator', () => {
    expect(parseArgs(['--', 'backup.dump', 'prod', '--yes'])).toEqual({ file: 'backup.dump', target: 'prod', assumeYes: true })
  })

  test('rejects an invalid target', () => {
    expect(() => parseArgs(['backup.dump', 'production'])).toThrow('Invalid target')
  })

  test('rejects missing arguments', () => {
    expect(() => parseArgs(['dev'])).toThrow('Usage')
    expect(() => parseArgs([])).toThrow('Usage')
  })
})

describe.concurrent('resolveConnectionString', () => {
  test('falls back to the local dev database', () => {
    expect(resolveConnectionString('dev', {})).toBe('postgres://homeserver:homeserver@localhost:5432/homeserver?sslmode=disable')
  })

  test('uses DB_CONNECTION_STRING for dev if set', () => {
    expect(resolveConnectionString('dev', { DB_CONNECTION_STRING: 'postgres://custom/dev' })).toBe('postgres://custom/dev')
  })

  test('uses DB_CONNECTION_STRING_TEST for test', () => {
    expect(resolveConnectionString('test', { DB_CONNECTION_STRING_TEST: 'postgres://custom/test' })).toBe('postgres://custom/test')
  })

  test('uses DB_CONNECTION_STRING_PROD for prod', () => {
    expect(resolveConnectionString('prod', { DB_CONNECTION_STRING_PROD: 'postgres://custom/prod' })).toBe('postgres://custom/prod')
  })

  test('throws if the target connection string is missing', () => {
    expect(() => resolveConnectionString('test', {})).toThrow('DB_CONNECTION_STRING_TEST')
    expect(() => resolveConnectionString('prod', {})).toThrow('DB_CONNECTION_STRING_PROD')
  })
})

describe.concurrent('resolveBackupFile', () => {
  const thisFile = fileURLToPath(import.meta.url)

  test('accepts an existing absolute path', () => {
    expect(resolveBackupFile(thisFile)).toBe(thisFile)
  })

  test('resolves a bare filename against the backup directory', () => {
    expect(resolveBackupFile('restoreBackup.tests.ts', path.dirname(thisFile))).toBe(thisFile)
  })

  test('throws for a missing file', () => {
    expect(() => resolveBackupFile('does-not-exist.dump')).toThrow('Backup file not found')
  })
})
