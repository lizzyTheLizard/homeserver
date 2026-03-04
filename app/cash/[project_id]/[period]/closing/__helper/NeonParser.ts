import { NeonTransaction } from '@/app/cash/_data/Monthly'
import { Temporal } from '@js-temporal/polyfill'
import { validate } from 'validate.js'
import { parse } from 'papaparse'

export function parseNeonFile(file: File): Promise<NeonTransaction[]> {
  return new Promise((resolve, reject) => {
    parse(file, {
      delimiter: ';',
      quoteChar: '"',
      header: true,
      skipEmptyLines: true,
      error: (error) => { reject(error) },
      complete: function (results) {
        if (results.data.length === 0) reject(new Error('CSV file is empty'))
        resolve(results.data.map((data, i) => {
          const validationResult = validate(data, NeonTransactionConstraints, { format: 'flat' }) as string[] | undefined
          if (validationResult?.[0]) reject(new Error('Invalid CSV data: ' + validationResult[0]))
          const input = data as { Date: string, Amount: string, Description?: string, Subject?: string }
          const date = Temporal.PlainDate.from(input.Date).toString()
          const amount = parseFloat(input.Amount)
          const description = input.Description
          const subject = ((input.Subject?.length ?? 0) > 0) ? input.Subject : undefined
          return { date, amount, description, subject, order: i }
        }))
      },
    })
  })
}

const NeonTransactionConstraints = {
  Date: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
      message: 'must be a valid date in the format YYYY-MM-DD',
    },
  },
  Amount: {
    presence: { allowEmpty: false },
    type: 'string',
    format: {
      pattern: '^-?\\d+(\\.\\d{1,2})?$',
      message: 'must be a valid number with up to 2 decimal places',
    },
  },
  Description: {
    type: 'string',
  },
  Subject: {
    type: 'string',
  },
}
