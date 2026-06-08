import { describe, expect, it } from 'vitest'
import { sortAndFilter } from './sortAndFilter'
import { numberColumn, textColumn } from './DataTableColumnBuilders'

interface TestRow {
  id: string
  name: string
  age: number
}

const sampleData: TestRow[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
  { id: '3', name: 'Charlie', age: 35 },
]

const columns = [
  textColumn('name'),
  numberColumn('age'),
]

describe('sortAndFilter', () => {
  it('returns full dataset when searchTerm is empty string', () => {
    const result = sortAndFilter(sampleData, [], '', columns)
    expect(result).toHaveLength(3)
    expect(result.map(r => r.id)).toEqual(['1', '2', '3'])
  })

  it('returns full dataset when searchTerm is whitespace only', () => {
    const result = sortAndFilter(sampleData, [], '   ', columns)
    expect(result).toHaveLength(3)
  })

  it('returns full dataset when searchTerm is null', () => {
    // @ts-expect-error testing null searchTerm
    const result = sortAndFilter(sampleData, [], null, columns)
    expect(result).toHaveLength(3)
  })

  it('returns full dataset when searchTerm is undefined', () => {
    // @ts-expect-error testing undefined searchTerm
    const result = sortAndFilter(sampleData, [], undefined, columns)
    expect(result).toHaveLength(3)
  })

  it('applies filtering when searchTerm has content', () => {
    const result = sortAndFilter(sampleData, [], 'ali', columns)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice')
  })

  it('applies sorting when searchTerm is empty', () => {
    const result = sortAndFilter(sampleData, [{ key: 'age', direction: 'ASC' }], '', columns)
    expect(result[0].age).toBe(25)
    expect(result[1].age).toBe(30)
    expect(result[2].age).toBe(35)
  })
})
