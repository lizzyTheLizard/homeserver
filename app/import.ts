// TODO: Remove this script, import-azure in package.json and the packages "mongodb" and "tsx" from dependencies

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Db, MongoClient } from 'mongodb'
import { logger } from './shared/logger'
import { createOrModifyProject, ProjectInput } from './cash/_data/Project'
import { setupPool } from './shared/_external/db/setup'
import { config } from './shared/config'
import { PoolClient } from 'pg'
import { AccountInput, createOrModifyAccount } from './cash/_data/Account'
import { createTransaction, TransactionInput } from './cash/_data/Transaction'
import { ClosingInput, createClosing } from './cash/_data/Closing'
import { recalculateTransactions } from './cash/_helper/RecalculateAccountTransactions'
import { Temporal } from '@js-temporal/polyfill'
import { AccountType } from './cash/_data/AccountType'

const ownerId = 'sNtAXgwUYBxB3YDmgSY0j17bVGH4PMDN_Qt04POufuo'

async function connectToAzureDB(): Promise<MongoClient> {
  const url = `mongodb://${process.env.AZURE_DB_USERNAME!}:${process.env.AZURE_DB_PASSWORD!}@${process.env.AZURE_DB_HOST!}:${process.env.AZURE_DB_PORT!}/${process.env.AZURE_DB_NAME!}?retryWrites=false&ssl=true`
  const urlSafe = `mongodb://${process.env.AZURE_DB_USERNAME!}:****@${process.env.AZURE_DB_HOST!}:${process.env.AZURE_DB_PORT!}/${process.env.AZURE_DB_NAME!}?retryWrites=false&ssl=true`
  const mongoClient = new MongoClient(url)
  await mongoClient.connect()
  logger.debug(`Connected to Azure Cosmos DB at ${urlSafe}`)
  return mongoClient
}

async function connectToSqlDB(): Promise<PoolClient> {
  const pool = await setupPool(false)
  const sqlClient = await pool.connect()
  logger.debug(`Connected to SQL database at ${config.DB_CONNECTION_STRING}`)
  return sqlClient
}

async function cleanExistingDB(sqlClient: PoolClient): Promise<void> {
  await sqlClient.query('TRUNCATE account_transaction, transaction, account, closing, project')
}

async function getExistingProjects(mongoDb: Db): Promise<ProjectInput[]> {
  const projects = await mongoDb.collection('CashProjekt').find({}).toArray()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return projects.map(p => ({ id: p._id.toString(), name: p.name.toString(), archived: p.archived, owner_id: ownerId }))
}

async function getExistingAccounts(mongoDb: Db, projectId: string): Promise<AccountInput[]> {
  const accounts = await mongoDb.collection('CashKonto').find({ projektId: projectId }).toArray()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
  return accounts.map(a => ({ id: a._id.toString(), name: a.name.toString(), archived: a.archived, project_id: projectId, owner_id: ownerId, type: mapAccountType(a.typ.toString()) }))
}

function mapAccountType(type: string): AccountType {
  switch (type) {
    case 'ANLAGEN': return 'Asset'
    case 'AUSGABEN': return 'Expense'
    case 'EIGENKAPITAL': return 'Equity'
    case 'EINNAHMEN': return 'Income'
    case 'FINANZ_EINKOMMEN': return 'Income'
    case 'FREMDKAPITAL': return 'Liability'
    case 'GELD': return 'Cash'
    case 'GEWINN': return 'Profit'
    default: throw new Error(`Unknown account type: ${type}`)
  }
}

async function getExistingTransactions(mongoDb: Db, projectId: string): Promise<TransactionInput[]> {
  const transactions = await mongoDb.collection('CashBuchung').find({ projektId: projectId }).toArray()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return transactions.map(t => ({ id: t._id.toString(), project_id: projectId, credit_account_id: t.vonKontoId, debit_account_id: t.anKontoId, amount: t.betrag, date: t.datum, description: t.kommentar.toString(), owner_id: ownerId }))
}

async function getExistingClosings(mongoDb: Db, projectId: string): Promise<ClosingInput[]> {
  const closings = await mongoDb.collection('CashAbschluss').find({ projektId: projectId }).toArray()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return closings.map(c => ({ id: c._id.toString(), project_id: projectId, capital_account_id: c.vermoegenKontoId, profit_account_id: c.gewinnKontoId, profit: c.gewinn, date: c.datum }))
}

export async function importDatabaseFromAzure() {
  const mongoClient = await connectToAzureDB()
  const mongoDb = mongoClient.db(process.env.AZURE_DB_NAME)
  const sqlClient = await connectToSqlDB()
  try {
    await sqlClient.query('BEGIN')
    await cleanExistingDB(sqlClient)
    const existingProjects = await getExistingProjects(mongoDb)
    for (const existingProject of existingProjects) {
      const project = await createOrModifyProject(sqlClient, existingProject)
      const accounts = await getExistingAccounts(mongoDb, existingProject.id)
      for (const account of accounts) await createOrModifyAccount(sqlClient, ownerId, account)
      const closings = await getExistingClosings(mongoDb, existingProject.id)
      for (const closing of closings) await createClosing(sqlClient, ownerId, closing)
      const transactions = await getExistingTransactions(mongoDb, existingProject.id)
      for (const transaction of transactions) await createTransaction(sqlClient, ownerId, transaction)
      logger.debug(`Start recalculating transactions`)
      await recalculateTransactions(sqlClient, ownerId, existingProject.id, Temporal.PlainDate.from('2000-01-01'), accounts.map(a => a.id))
      logger.info(`Finish import project: ${JSON.stringify(project)}`)
    }
    await sqlClient.query('COMMIT')
  }
  catch (error) {
    await sqlClient.query('ROLLBACK')
    throw error
  }
  finally {
    sqlClient.release()
    await mongoClient.close()
  }
}

importDatabaseFromAzure()
  .then(() => logger.info('Database import completed'))
  .catch((e: unknown) => logger.error('Error during database import:', e))
