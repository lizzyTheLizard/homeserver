import { NeonTransaction } from '@/app/cash/_data/Monthly'
import { Temporal } from '@js-temporal/polyfill'
import { z } from 'zod'
import { parse, ParseResult } from 'papaparse'

export function parseNeonFile(file: File): Promise<NeonTransaction[]> {
  return new Promise((resolve, reject) => {
    parse(file, {
      delimiter: ';',
      quoteChar: '"',
      header: true,
      skipEmptyLines: true,
      error: (error) => { reject(error) },
      complete: (results) => { complete(resolve, reject, results) },
    })
  })
}

function complete(resolve: (result: NeonTransaction[]) => void, reject: (reason: unknown) => void, results: ParseResult<unknown>) {
  if (results.data.length === 0) {
    reject(new Error('CSV file is empty'))
    return
  }
  const rows: NeonTransaction[] = []
  for (const input of results.data) {
    const parsingResult = NeonRowSchema.safeParse(input)
    if (!parsingResult.success) {
      reject(new Error('Invalid CSV data: ' + (parsingResult.error.issues[0]?.message ?? 'unknown error')))
      return
    }
    const rawRow = parsingResult.data
    const row = {
      date: Temporal.PlainDate.from(rawRow.Date).toString(),
      amount: parseFloat(rawRow.Amount),
      description: rawRow.Description,
      subject: ((rawRow.Subject?.length ?? 0) > 0) ? rawRow.Subject : undefined,
      order: rows.length,
    }
    rows.push(row)
  }
  resolve(rows)
}

const NeonRowSchema = z.object({
  Date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'must be a valid date in the format YYYY-MM-DD'),
  Amount: z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'must be a valid number with up to 2 decimal places'),
  Description: z.string().optional(),
  Subject: z.string().optional(),
})
