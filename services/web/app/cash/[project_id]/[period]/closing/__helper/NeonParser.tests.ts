import { expect, describe, test } from 'vitest'
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
"2026-01-29";"-5.10";"";"";"";"Coop";;"household";"";"no";"no"`], 'valid.csv')
    const transactions = await parseNeonFile(file)
    expect(transactions).toEqual([
      { date: '2026-01-31', amount: -1.80, description: 'Migros', subject: undefined, order: 0 },
      { date: '2026-01-30', amount: -200.00, description: 'TWINT', subject: '910051828027748069472557016', order: 1 },
      { date: '2026-01-30', amount: -10.90, description: 'Migros Restaurant', subject: undefined, order: 2 },
      { date: '2026-01-29', amount: -5.10, description: 'Coop', subject: undefined, order: 3 },
    ])
  })
})
