const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * Parses a date from the various formats the backend may send into a `Date`.
 * Handles:
 * - A string parseable by `new Date()` (e.g. ISO string, 'YYYY-MM-DD').
 * - An array of numbers like `[YYYY, MM, DD]`.
 * - Null/undefined.
 *
 * Returns `null` when the input is empty or cannot be parsed to a valid date.
 */
const parseDate = (date: string | number[] | null | undefined): Date | null => {
  if (!date) {
    return null
  }

  let d: Date
  if (Array.isArray(date)) {
    d = new Date(date[0], date[1] - 1, date[2])
  } else {
    const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(date)
    if (isoDateOnly) {
      const [year, month, day] = date.split('-').map(Number)
      d = new Date(year, month - 1, day)
    } else {
      d = new Date(date)
    }
  }

  return isNaN(d.getTime()) ? null : d
}

/**
 * Formats a date from various possible backend formats into a 'YYYY-MM-DD' string.
 * It can handle:
 * - A string that can be parsed by `new Date()` (e.g., ISO string, 'YYYY-MM-DD').
 * - An array of numbers like `[YYYY, MM, DD]`.
 * - Null or undefined values, which will return an empty string.
 *
 * This remains the canonical format used for storage, date-picker inputs, save
 * payloads, sorting, and validation. For human-readable display use
 * `formatDateMedium` / `formatDateLong`.
 *
 * @param date - The date value to format.
 * @returns A formatted date string 'YYYY-MM-DD' or an empty string.
 */
export const formatDate = (date: string | number[] | null | undefined): string => {
  if (!date) {
    return ''
  }

  const d = parseDate(date)
  if (!d) {
    return typeof date === 'string' ? date : '' // Return original string if invalid, or empty for other types
  }

  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Formats a date for display as 'Jan 1, 2026' (abbreviated month, un-padded day).
 *
 * Accepts the same inputs as `formatDate`. Returns an empty string for empty
 * input, or the original string when it is an unparseable string. Use this for
 * read-only displays where space is limited (e.g. table cells).
 */
export const formatDateMedium = (date: string | number[] | null | undefined): string => {
  if (!date) {
    return ''
  }

  const d = parseDate(date)
  if (!d) {
    return typeof date === 'string' ? date : ''
  }

  return `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/**
 * Formats a date for display as 'January 1, 2026' (full month, un-padded day).
 *
 * Accepts the same inputs as `formatDate`. Returns an empty string for empty
 * input, or the original string when it is an unparseable string. Use this for
 * read-only displays where there is generous horizontal space (e.g. labels).
 */
export const formatDateLong = (date: string | number[] | null | undefined): string => {
  if (!date) {
    return ''
  }

  const d = parseDate(date)
  if (!d) {
    return typeof date === 'string' ? date : ''
  }

  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/**
 * Formats a picked date as 'YYYY-MM-DD' in local time. `toISOString()` would use UTC, which
 * moves the date back a day when the browser is east of UTC.
 */
export const toIsoLocalDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
