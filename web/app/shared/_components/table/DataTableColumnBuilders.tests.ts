import { describe, expect, it } from 'vitest'
import { numberColumn, textColumn, dateColumn, boolColumn, enumColumn } from './DataTableColumnBuilders'

describe('numberColumn search', () => {
  const col = numberColumn('age')

  it('matches when value matches search term', () => {
    expect(col.search(30, '3')).toBe(true)
    expect(col.search(30, '30')).toBe(true)
  })

  it('does not match when value does not match', () => {
    expect(col.search(30, '5')).toBe(false)
  })
})

describe('textColumn search', () => {
  const col = textColumn('name')

  it('matches when value includes search term (case insensitive)', () => {
    expect(col.search('Alice', 'ali')).toBe(true)
    expect(col.search('Alice', 'ALI')).toBe(true)
  })

  it('does not match when value does not include search term', () => {
    expect(col.search('Alice', 'bob')).toBe(false)
  })
})

describe('dateColumn search', () => {
  const col = dateColumn('createdAt')

  it('matches when value starts with search term', () => {
    expect(col.search('2024-01-15', '2024')).toBe(true)
    expect(col.search('2024-01-15', '2024-01')).toBe(true)
  })

  it('does not match when value does not start with search term', () => {
    expect(col.search('2024-01-15', '02')).toBe(false)
  })
})

describe('boolColumn search', () => {
  const col = boolColumn('active')

  it('always returns false', () => {
    expect(col.search(true, '')).toBe(false)
    expect(col.search(false, '')).toBe(false)
  })
})

describe('enumColumn search', () => {
  const col = enumColumn('status', ['active', 'inactive'])

  it('matches when value starts with search term (case insensitive)', () => {
    expect(col.search('active', 'act')).toBe(true)
    expect(col.search('active', 'ACT')).toBe(true)
  })

  it('does not match when value does not start with search term', () => {
    expect(col.search('active', 'inactive')).toBe(false)
  })
})
