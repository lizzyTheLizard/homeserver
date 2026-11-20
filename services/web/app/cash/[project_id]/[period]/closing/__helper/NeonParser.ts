import { type ParseResult, parse } from 'papaparse';
import type { NeonTransaction } from '@/app/cash/_data/Monthly'
import { Temporal } from '@js-temporal/polyfill'
import { z } from 'zod'

export function parseNeonFile(file: File): Promise<NeonTransaction[]> {
  return new Promise((resolve, reject) => {
    parse(file, {
      complete: (results) => { complete(resolve, reject, results) },
      delimiter: ';',
      error: (error) => { reject(error) },
      header: true,
      quoteChar: '"',
      skipEmptyLines: true,
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
      reject(new Error(`Invalid CSV data: ${  parsingResult.error.issues[0]?.message ?? 'unknown error'}`))
      return
    }
    const rawRow = parsingResult.data,
     row = {
      amount: parseFloat(rawRow.Amount),
      date: Temporal.PlainDate.from(rawRow.Date).toString(),
      description: rawRow.Description,
      order: rows.length,
      subject: ((rawRow.Subject?.length ?? 0) > 0) ? rawRow.Subject : undefined,
    }
    rows.push(row)
  }
  resolve(rows)
}

const NeonRowSchema = z.object({
  Amount: z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'must be a valid number with up to 2 decimal places'),
  Date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'must be a valid date in the format YYYY-MM-DD'),
  Description: z.string().optional(),
  Subject: z.string().optional(),
})
