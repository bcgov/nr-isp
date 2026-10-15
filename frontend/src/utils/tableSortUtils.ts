const MONTH_ABBR_TO_NUM: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}

/**
 * Parse a month-year string into a numeric value suitable for chronological sorting.
 * Supported formats:
 *   "Apr"       → month only  (year defaults to 0 so bare months sort before any year)
 *   "2025"      → year only   (month defaults to 0)
 *   "Apr 1997"  → month + year
 * Returns NaN when the value cannot be parsed so it falls back to string comparison.
 */
export const parseMonthYearToSortValue = (value: string): number => {
  if (!value) return NaN
  const trimmed = value.trim()
  const parts = trimmed.split(/\s+/)

  if (parts.length === 2) {
    const month = MONTH_ABBR_TO_NUM[parts[0].toLowerCase()]
    const year = parseInt(parts[1], 10)
    if (month && !isNaN(year)) return year * 100 + month
  }

  if (parts.length === 1) {
    const asYear = parseInt(parts[0], 10)
    if (!isNaN(asYear) && parts[0].length === 4) return asYear * 100
    const month = MONTH_ABBR_TO_NUM[parts[0].toLowerCase()]
    if (month) return month // year 0 → sorts before any real year
  }

  return NaN
}
