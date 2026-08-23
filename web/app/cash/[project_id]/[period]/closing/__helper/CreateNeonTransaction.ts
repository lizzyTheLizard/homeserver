import { Monthly, NeonTransaction } from '@/app/cash/_data/Monthly'
import { Queryable } from '@/app/shared/_external/db/access'
import { NeonTransactionInput } from '../server'
import { v4 as randomUUID } from 'uuid'
import { createTransaction } from '@/app/cash/_data/Transaction'
import { recalculateTransactions } from '@/app/cash/_helper/RecalculateAccountTransactions'
import { Temporal } from '@js-temporal/polyfill'
import { lastDay, toString } from '@/app/cash/_helper/Period'

export async function createTransactionsFromNeonInput(client: Queryable, owner: string, monthly: Monthly, transactionInput: NeonTransactionInput[]): Promise<NeonTransaction[]> {
  const result: NeonTransaction[] = []
  for (const i of transactionInput) {
    result.push(await createTransactionFromNeonInput(client, owner, monthly, i))
  }
  await createRemainingTransaction(client, owner, monthly, transactionInput)
  const from = Temporal.PlainDate.from(result.reduce((min, t) => t.date < min ? t.date : min, '9999-12-31'))
  const accounts = [monthly.neon_account_id, ...transactionInput.map(i => i.accountId), monthly.remaining_account_id]
  await recalculateTransactions(client, owner, monthly.project_id, from, accounts)
  return monthly.neon_transactions.map((nt) => {
    const r = result.find(r => r.order === nt.order)
    if (!r) return nt
    return { ...nt, transaction_id: r.transaction_id }
  })
}

async function createTransactionFromNeonInput(client: Queryable, owner: string, monthly: Monthly, transactionInput: NeonTransactionInput): Promise<NeonTransaction> {
  const existingTransaction = monthly.neon_transactions.find(t => t.order === transactionInput.order)
  if (!existingTransaction) throw new Error('No existing transaction found for order ' + transactionInput.order.toString())
  const transaction = {
    id: randomUUID(),
    project_id: monthly.project_id,
    amount: Math.abs(existingTransaction.amount),
    credit_account_id: existingTransaction.amount < 0 ? monthly.neon_account_id : transactionInput.accountId,
    debit_account_id: existingTransaction.amount < 0 ? transactionInput.accountId : monthly.neon_account_id,
    date: existingTransaction.date,
    description: transactionInput.description,
  }
  const t = await createTransaction(client, owner, transaction)
  return { ...existingTransaction, transaction_id: t.id }
}

async function createRemainingTransaction(client: Queryable, owner: string, monthly: Monthly, transactions: NeonTransactionInput[]): Promise<void> {
  const remainingAmount = monthly.neon_transactions
    .filter(t => !transactions.some(input => input.order === t.order))
    .reduce((acc, t) => acc + t.amount, 0)
  const transaction = {
    id: randomUUID(),
    project_id: monthly.project_id,
    amount: Math.abs(remainingAmount),
    credit_account_id: remainingAmount < 0 ? monthly.neon_account_id : monthly.remaining_account_id,
    debit_account_id: remainingAmount < 0 ? monthly.remaining_account_id : monthly.neon_account_id,
    date: lastDay(monthly.period),
    description: 'Remaining amount for ' + toString(monthly.period),
  }
  await createTransaction(client, owner, transaction)
}
