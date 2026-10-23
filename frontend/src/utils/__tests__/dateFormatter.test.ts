import { describe, it, expect } from 'vitest'
import { formatDate, formatDateMedium, formatDateLong, toIsoLocalDate } from '@/utils/dateFormatter'

describe('formatDate', () => {
  it('returns an empty string for null, undefined and empty input', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('')).toBe('')
  })

  it('formats an array [YYYY, MM, DD]', () => {
    expect(formatDate([2026, 1, 5])).toBe('2026-01-05')
    expect(formatDate([2025, 12, 31])).toBe('2025-12-31')
  })

  it('passes through an ISO date-only string (no timezone shift)', () => {
    expect(formatDate('2026-01-05')).toBe('2026-01-05')
    expect(formatDate('2026-12-31')).toBe('2026-12-31')
  })

  it('formats a full ISO datetime string', () => {
    // Parsed by new Date(); formatted using local time parts.
    const d = new Date('2026-03-15T12:00:00')
    expect(formatDate('2026-03-15T12:00:00')).toBe(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    )
  })

  it('returns the original string when it cannot be parsed', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })

  it('returns an empty string for an unparseable array', () => {
    expect(formatDate([NaN, NaN, NaN])).toBe('')
  })
})

describe('formatDateMedium', () => {
  it('returns an empty string for empty input', () => {
    expect(formatDateMedium(null)).toBe('')
    expect(formatDateMedium(undefined)).toBe('')
    expect(formatDateMedium('')).toBe('')
  })

  it('formats as abbreviated month, un-padded day', () => {
    expect(formatDateMedium('2026-01-05')).toBe('Jan 5, 2026')
    expect(formatDateMedium([2026, 12, 9])).toBe('Dec 9, 2026')
  })

  it('returns the original string when unparseable', () => {
    expect(formatDateMedium('garbage')).toBe('garbage')
  })

  it('returns an empty string for an unparseable non-string', () => {
    expect(formatDateMedium([NaN, 1, 1])).toBe('')
  })
})

describe('formatDateLong', () => {
  it('returns an empty string for empty input', () => {
    expect(formatDateLong(null)).toBe('')
    expect(formatDateLong(undefined)).toBe('')
    expect(formatDateLong('')).toBe('')
  })

  it('formats as full month, un-padded day', () => {
    expect(formatDateLong('2026-01-05')).toBe('January 5, 2026')
    expect(formatDateLong([2026, 9, 1])).toBe('September 1, 2026')
  })

  it('returns the original string when unparseable', () => {
    expect(formatDateLong('garbage')).toBe('garbage')
  })

  it('returns an empty string for an unparseable non-string', () => {
    expect(formatDateLong([NaN, 1, 1])).toBe('')
  })
})

describe('toIsoLocalDate', () => {
  it('formats the local calendar date with padding', () => {
    expect(toIsoLocalDate(new Date(2024, 0, 5, 23, 30))).toBe('2024-01-05')
    expect(toIsoLocalDate(new Date(2024, 10, 15, 0, 0))).toBe('2024-11-15')
  })
})
