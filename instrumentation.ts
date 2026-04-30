export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('./app/shared/logger')
    logger.info('Initializing application')
    const { initPool } = await import('./app/shared/_external/db/access')
    await initPool()
    const { getDbPhaseTimings } = await import('./app/shared/_external/db/setup')
    const phases = getDbPhaseTimings()
    logger.info(`Application initializalization completed. DB connection took ${phases ? phases.connectionMs.toString() + 'ms' : 'n/a'} and migration took ${phases ? phases.migrationMs.toString() + 'ms' : 'n/a'} and db migration took ${phases ? phases.migrationMs.toString() + 'ms' : 'n/a'}`)
  }
}
