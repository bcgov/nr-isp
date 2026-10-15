import { describe, expect, it } from 'vitest'
import { parseMonthYearToSortValue } from '@/utils/tableSortUtils'

describe('parseMonthYearToSortValue', () => {
  it('parses "Month YYYY" into a chronologically sortable number', () => {
    expect(parseMonthYearToSortValue('Apr 1997')).toBe(199704)
    expect(parseMonthYearToSortValue('dec 2025')).toBe(202512)
  })

  it('parses a bare four-digit year with month 0', () => {
    expect(parseMonthYearToSortValue('2025')).toBe(202500)
  })

  it('parses a bare month with year 0 so it sorts before any year', () => {
    expect(parseMonthYearToSortValue('Apr')).toBe(4)
    expect(parseMonthYearToSortValue('JAN')).toBe(1)
  })

  it('returns NaN for unparseable values', () => {
    expect(parseMonthYearToSortValue('')).toBeNaN()
    expect(parseMonthYearToSortValue('not a month')).toBeNaN()
    expect(parseMonthYearToSortValue('Apr xyz')).toBeNaN()
    expect(parseMonthYearToSortValue('123')).toBeNaN()
  })
})
