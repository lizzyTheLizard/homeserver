import { Monthly, NeonTransaction } from '@/app/cash/_data/Monthly'
import { PoolClient } from 'pg'
import { NeonTransactionInput } from '../server'
import { v4 as randomUUID } from 'uuid'
import { createTransaction, TransactionInput } from '@/app/cash/_data/Transaction'
import { recalculateTransactions } from '@/app/cash/_helper/RecalculateAccountTransactions'
import { Temporal } from '@js-temporal/polyfill'

export async function createTransactionsFromNeonInput(client: PoolClient, owner: string, monthly: Monthly, transactionInput: NeonTransactionInput[]): Promise<NeonTransaction[]> {
  const result = await Promise.all(transactionInput.map(i => createTransactionFromNeonInput(client, owner, monthly, i)))
  const from = Temporal.PlainDate.from(result.reduce((min, t) => t.date < min ? t.date : min, '9999-12-31'))
  const accounts = [monthly.neon_account_id, ...result.map(t => t.other_account)]
  await recalculateTransactions(client, owner, monthly.project_id, from, accounts)
  return monthly.neon_transactions.map((nt) => {
    const r = result.find(r => r.order === nt.order)
    if (!r) return nt
    return { ...nt, transaction_id: r.transaction_id }
  })
}

async function createTransactionFromNeonInput(client: PoolClient, owner: string, monthly: Monthly, transactionInput: NeonTransactionInput): Promise<NeonTransaction & { other_account: string }> {
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
  } as TransactionInput
  const t = await createTransaction(client, owner, transaction)
  return { ...existingTransaction, transaction_id: t.id, other_account: transactionInput.accountId }
}
