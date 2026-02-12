import { Monthly, NeonTransaction } from '@/app/cash/_data/Monthly'
import { PoolClient } from 'pg'
import { NeonTransactionInput } from '../server'
import { v4 as randomUUID } from 'uuid'
import { createTransaction, TransactionInput } from '@/app/cash/_data/Transaction'

export async function createTransactionsFromNeonInput(client: PoolClient, owner: string, monthly: Monthly, transactionInput: NeonTransactionInput[]): Promise<NeonTransaction[]> {
  return await Promise.all(transactionInput.map(i => createTransactionFromNeonInput(client, owner, monthly, i)))
}

async function createTransactionFromNeonInput(client: PoolClient, owner: string, monthly: Monthly, transactionInput: NeonTransactionInput): Promise<NeonTransaction> {
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
  return { ...existingTransaction, transaction_id: t.id } as NeonTransaction
}
