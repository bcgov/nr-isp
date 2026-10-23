/**
 * Centralized validation utilities for the ISP frontend application.
 * All reusable validation functions for form fields and data integrity checks.
 */

/**
 * Validates that the effective date is not after the expiry date.
 * Returns an error message if validation fails, or null if valid.
 */
export const validateDateRange = (
  effectiveDateStr: string | number[] | null | undefined,
  expiryDateStr: string | number[] | null | undefined,
): string | null => {
  if (!effectiveDateStr || !expiryDateStr) return null

  const toDate = (value: string | number[]): Date => {
    if (Array.isArray(value)) {
      const [year, month, day] = value
      return new Date(year, month - 1, day)
    }
    return new Date(value)
  }

  const effectiveDate = toDate(effectiveDateStr)
  const expiryDate = toDate(expiryDateStr)

  if (effectiveDate > expiryDate) {
    return 'Effective date cannot be after expiry date.'
  }

  return null
}

/**
 * Validates that a value is not empty (null, undefined, or blank string).
 * Returns an error message if validation fails, or null if valid.
 */
export const validateRequired = (
  value: string | null | undefined,
  fieldName: string,
): string | null => {
  if (!value || value.trim() === '') {
    return `${fieldName} cannot be empty.`
  }
  return null
}

/**
 * Checks if a value is a duplicate within a list of existing values (case-insensitive).
 * Returns an error message if a duplicate is found, or null if unique.
 */
export const validateNoDuplicate = (
  value: string,
  existingValues: string[],
  fieldName: string,
  excludeIndex?: number,
): string | null => {
  const normalizedValue = value.trim().toLowerCase()
  const isDuplicate = existingValues.some(
    (existing, index) =>
      index !== excludeIndex && existing.trim().toLowerCase() === normalizedValue,
  )
  if (isDuplicate) {
    return `A record with this ${fieldName} already exists.`
  }
  return null
}

/**
 * Validates that a numeric value is not negative.
 * Returns an error message if validation fails, or null if valid.
 */
export const validateNonNegative = (value: number | string, fieldName: string): string | null => {
  const num = typeof value === 'string' ? Number.parseFloat(value) : value
  if (!Number.isNaN(num) && num < 0) {
    return `${fieldName} cannot be a negative number.`
  }
  return null
}

/**
 * Validates that a minimum value does not exceed a maximum value.
 * Returns an error message if validation fails, or null if valid.
 */
export const validateMinMax = (
  minValue: number | string,
  maxValue: number | string,
  minFieldName: string,
  maxFieldName: string,
): string | null => {
  const min = typeof minValue === 'string' ? Number.parseFloat(minValue) : minValue
  const max = typeof maxValue === 'string' ? Number.parseFloat(maxValue) : maxValue

  if (Number.isNaN(min) || Number.isNaN(max)) return null

  if (min > max) {
    return `${minFieldName} cannot be greater than ${maxFieldName}.`
  }
  return null
}

/** A whole string such as "12", "-3.5" or ".5" as a number; NaN for anything else, e.g. "12abc". */
const parseDecimal = (value: string): number => {
  const trimmed = value.trim()
  return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(trimmed) ? Number(trimmed) : Number.NaN
}

/**
 * Validates a volume/numeric field for range and decimal precision.
 * Returns an error message if validation fails, or null if valid.
 */
export const validateNumericRange = (
  value: number | string,
  fieldName: string,
  min: number = 0,
  max: number = 9999.99,
  maxDecimalPlaces: number = 2,
): string | null => {
  const num = typeof value === 'string' ? parseDecimal(value) : value

  if (Number.isNaN(num)) {
    return `${fieldName} must be a valid number.`
  }
  if (num < min || num > max) {
    return `${fieldName} must be between ${min.toFixed(maxDecimalPlaces)} and ${max.toFixed(maxDecimalPlaces)}.`
  }
  const decimalPart = String(num).split('.')[1]
  if (decimalPart && decimalPart.length > maxDecimalPlaces) {
    return `${fieldName} cannot have more than ${maxDecimalPlaces} decimal places.`
  }
  return null
}

/**
 * Filters a string to only contain valid numeric characters (digits and a single decimal point).
 * Strips signs, letters, and extra decimal points. Use in onChange handlers to block non-numeric input.
 */
export const filterNumericInput = (value: string): string => {
  const filtered = value.replace(/[^\d.]/g, '')
  const firstDot = filtered.indexOf('.')
  if (firstDot === -1) return filtered
  return filtered.slice(0, firstDot + 1) + filtered.slice(firstDot + 1).replace(/\./g, '')
}

/**
 * Filters a string to only contain digits, for whole-number identifier fields (e.g. Mill Number)
 * that must not accept a decimal point. Use in onChange handlers to block non-integer input.
 */
export const filterIntegerInput = (value: string): string => value.replace(/\D/g, '')

/**
 * Validates that required volume fields are not empty.
 * Returns an error message if either value is empty, or null if valid.
 */
export const validateVolumesNotEmpty = (
  minValue: string | number | null | undefined,
  maxValue: string | number | null | undefined,
  minFieldName: string = 'Min Converted Volume AMV',
  maxFieldName: string = 'Max Converted Volume AMV',
): string | null => {
  if (
    minValue == null ||
    String(minValue).trim() === '' ||
    maxValue == null ||
    String(maxValue).trim() === ''
  ) {
    return `${minFieldName} and ${maxFieldName} cannot be empty.`
  }
  return null
}

/**
 * Signals that a row failed client-side validation, as opposed to the server rejecting it.
 *
 * ReusableDataTable only clears a row's edit state when `onSave` resolves, so a handler
 * that merely `return`s after a validation failure would show the error while silently
 * discarding what the user typed. Handlers throw this instead: the row stays in edit
 * mode with the input intact, and the table knows not to log it as an unexpected fault.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export const isValidationError = (error: unknown): error is ValidationError =>
  error instanceof ValidationError
