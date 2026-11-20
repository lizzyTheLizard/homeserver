import { describe, expect, test } from 'vitest'
import { parseNeonFile } from './NeonParser'

describe('parseNeonFile', () => {
  test('empty file', async () => {
    const file = new File([], 'empty.csv')
    await expect(parseNeonFile(file)).rejects.toThrow()
  })

  test('non', async () => {
    const file = new File([`non csv content`], 'invalid.csv')
    await expect(parseNeonFile(file)).rejects.toThrow()
  })

  test('invalid CSV format', async () => {
    const file = new File([`"Other";"Stuff";"What";"is";"This";"Test";"Data";"Not";"The";"Right";"Format"
"2026-01-31";"-1.80";"";"";"";"Migros";;"household";"";"no";"no"
"2026-01-30";"-200.00";"";"";"";"TWINT";"910051828027748069472557016";"finances";"";"no";"no"
"2026-01-30";"-10.90";"";"";"";"Migros Restaurant";;"food";"";"no";"no"
"2026-01-29";"-5.10";"";"";"";"Coop";;"household";"";"no";"no"`], 'invalid.csv')
    await expect(parseNeonFile(file)).rejects.toThrow()
  })

  test('valid CSV file', async () => {
    const file = new File([`"Date";"Amount";"Original amount";"Original currency";"Exchange rate";"Description";"Subject";"Category";"Tags";"Wise";"Spaces"
"2026-01-31";"-1.80";"";"";"";"Migros";;"household";"";"no";"no"
"2026-01-30";"-200.00";"";"";"";"TWINT";"910051828027748069472557016";"finances";"";"no";"no"
"2026-01-30";"-10.90";"";"";"";"Migros Restaurant";;"food";"";"no";"no"
"2026-01-29";"-5.10";"";"";"";"Coop";;"household";"";"no";"no"`], 'valid.csv'),
     transactions = await parseNeonFile(file)
    expect(transactions).toEqual([
      { amount: -1.80, date: '2026-01-31', description: 'Migros', order: 0, subject: undefined },
      { amount: -200.00, date: '2026-01-30', description: 'TWINT', order: 1, subject: '910051828027748069472557016' },
      { amount: -10.90, date: '2026-01-30', description: 'Migros Restaurant', order: 2, subject: undefined },
      { amount: -5.10, date: '2026-01-29', description: 'Coop', order: 3, subject: undefined },
    ])
  })
})
