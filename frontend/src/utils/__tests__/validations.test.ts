import { describe, it, expect } from 'vitest'
import {
  validateDateRange,
  validateRequired,
  validateNoDuplicate,
  validateNonNegative,
  validateMinMax,
  validateNumericRange,
  filterNumericInput,
  validateVolumesNotEmpty,
  ValidationError,
  isValidationError,
} from '@/utils/validations'

describe('validateDateRange', () => {
  it('returns null when either date is missing', () => {
    expect(validateDateRange(null, '2026-01-01')).toBeNull()
    expect(validateDateRange('2026-01-01', undefined)).toBeNull()
    expect(validateDateRange('', '')).toBeNull()
  })

  it('returns null when effective date is before expiry date', () => {
    expect(validateDateRange('2026-01-01', '2026-12-31')).toBeNull()
  })

  it('returns null when dates are equal', () => {
    expect(validateDateRange('2026-06-15', '2026-06-15')).toBeNull()
  })

  it('returns an error when effective date is after expiry date', () => {
    expect(validateDateRange('2026-12-31', '2026-01-01')).toBe(
      'Effective date cannot be after expiry date.',
    )
  })

  it('handles array date inputs [YYYY, MM, DD]', () => {
    expect(validateDateRange([2026, 12, 31], [2026, 1, 1])).toBe(
      'Effective date cannot be after expiry date.',
    )
    expect(validateDateRange([2026, 1, 1], [2026, 12, 31])).toBeNull()
  })

  it('handles mixed string and array inputs', () => {
    expect(validateDateRange('2026-12-31', [2026, 1, 1])).toBe(
      'Effective date cannot be after expiry date.',
    )
  })
})

describe('validateRequired', () => {
  it('returns an error for null, undefined and blank values', () => {
    expect(validateRequired(null, 'Name')).toBe('Name cannot be empty.')
    expect(validateRequired(undefined, 'Name')).toBe('Name cannot be empty.')
    expect(validateRequired('', 'Name')).toBe('Name cannot be empty.')
    expect(validateRequired('   ', 'Name')).toBe('Name cannot be empty.')
  })

  it('returns null for a non-empty value', () => {
    expect(validateRequired('value', 'Name')).toBeNull()
  })
})

describe('validateNoDuplicate', () => {
  it('detects a case-insensitive duplicate', () => {
    expect(validateNoDuplicate('ABC', ['abc', 'def'], 'code')).toBe(
      'A record with this code already exists.',
    )
  })

  it('trims whitespace when comparing', () => {
    expect(validateNoDuplicate('  abc ', ['ABC  '], 'code')).toBe(
      'A record with this code already exists.',
    )
  })

  it('returns null when the value is unique', () => {
    expect(validateNoDuplicate('xyz', ['abc', 'def'], 'code')).toBeNull()
  })

  it('excludes the row at excludeIndex from the comparison', () => {
    expect(validateNoDuplicate('abc', ['abc', 'def'], 'code', 0)).toBeNull()
    expect(validateNoDuplicate('abc', ['abc', 'abc'], 'code', 0)).toBe(
      'A record with this code already exists.',
    )
  })
})

describe('validateNonNegative', () => {
  it('returns an error for negative numbers', () => {
    expect(validateNonNegative(-1, 'Volume')).toBe('Volume cannot be a negative number.')
    expect(validateNonNegative('-0.5', 'Volume')).toBe('Volume cannot be a negative number.')
  })

  it('returns null for zero and positive numbers', () => {
    expect(validateNonNegative(0, 'Volume')).toBeNull()
    expect(validateNonNegative('12.3', 'Volume')).toBeNull()
  })

  it('returns null for non-numeric strings (NaN)', () => {
    expect(validateNonNegative('abc', 'Volume')).toBeNull()
  })
})

describe('validateMinMax', () => {
  it('returns an error when min exceeds max', () => {
    expect(validateMinMax(10, 5, 'Min', 'Max')).toBe('Min cannot be greater than Max.')
    expect(validateMinMax('10.5', '10.4', 'Min', 'Max')).toBe('Min cannot be greater than Max.')
  })

  it('returns null when min is less than or equal to max', () => {
    expect(validateMinMax(1, 2, 'Min', 'Max')).toBeNull()
    expect(validateMinMax(2, 2, 'Min', 'Max')).toBeNull()
  })

  it('returns null when either value is not a number', () => {
    expect(validateMinMax('abc', 5, 'Min', 'Max')).toBeNull()
    expect(validateMinMax(5, 'abc', 'Min', 'Max')).toBeNull()
  })
})

describe('validateNumericRange', () => {
  it('returns an error for non-numeric values', () => {
    expect(validateNumericRange('abc', 'Volume')).toBe('Volume must be a valid number.')
  })

  it('returns an error when outside the default range', () => {
    expect(validateNumericRange(-0.01, 'Volume')).toBe('Volume must be between 0.00 and 9999.99.')
    expect(validateNumericRange(10000, 'Volume')).toBe('Volume must be between 0.00 and 9999.99.')
  })

  it('returns an error for too many decimal places', () => {
    expect(validateNumericRange('12.345', 'Volume')).toBe(
      'Volume cannot have more than 2 decimal places.',
    )
  })

  it('returns null for valid values', () => {
    expect(validateNumericRange(0, 'Volume')).toBeNull()
    expect(validateNumericRange('9999.99', 'Volume')).toBeNull()
    expect(validateNumericRange('12.34', 'Volume')).toBeNull()
    expect(validateNumericRange(42, 'Volume')).toBeNull()
  })

  it('respects custom range and decimal precision', () => {
    expect(validateNumericRange(15, 'Pct', 0, 10, 1)).toBe('Pct must be between 0.0 and 10.0.')
    expect(validateNumericRange('1.23', 'Pct', 0, 10, 1)).toBe(
      'Pct cannot have more than 1 decimal places.',
    )
    expect(validateNumericRange('1.2', 'Pct', 0, 10, 1)).toBeNull()
  })
})

describe('filterNumericInput', () => {
  it('strips non-numeric characters', () => {
    expect(filterNumericInput('a1b2c3')).toBe('123')
    expect(filterNumericInput('-12')).toBe('12')
    expect(filterNumericInput('+4e2')).toBe('42')
  })

  it('keeps a single decimal point and strips extras', () => {
    expect(filterNumericInput('1.2.3')).toBe('1.23')
    expect(filterNumericInput('..5')).toBe('.5')
  })

  it('returns filtered value unchanged when no decimal point present', () => {
    expect(filterNumericInput('123')).toBe('123')
    expect(filterNumericInput('')).toBe('')
  })
})

describe('validateVolumesNotEmpty', () => {
  it('returns an error when the min value is empty', () => {
    expect(validateVolumesNotEmpty(null, 5)).toBe(
      'Min Converted Volume AMV and Max Converted Volume AMV cannot be empty.',
    )
    expect(validateVolumesNotEmpty('  ', 5)).toBe(
      'Min Converted Volume AMV and Max Converted Volume AMV cannot be empty.',
    )
  })

  it('returns an error when the max value is empty', () => {
    expect(validateVolumesNotEmpty(1, undefined)).toBe(
      'Min Converted Volume AMV and Max Converted Volume AMV cannot be empty.',
    )
    expect(validateVolumesNotEmpty(1, '')).toBe(
      'Min Converted Volume AMV and Max Converted Volume AMV cannot be empty.',
    )
  })

  it('uses custom field names in the message', () => {
    expect(validateVolumesNotEmpty(null, null, 'Min X', 'Max X')).toBe(
      'Min X and Max X cannot be empty.',
    )
  })

  it('returns null when both values are present (including 0)', () => {
    expect(validateVolumesNotEmpty(0, 0)).toBeNull()
    expect(validateVolumesNotEmpty('1.5', '2.5')).toBeNull()
  })
})

describe('ValidationError', () => {
  it('is an Error with name ValidationError', () => {
    const err = new ValidationError('bad input')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ValidationError')
    expect(err.message).toBe('bad input')
  })

  it('isValidationError narrows correctly', () => {
    expect(isValidationError(new ValidationError('x'))).toBe(true)
    expect(isValidationError(new Error('x'))).toBe(false)
    expect(isValidationError('x')).toBe(false)
    expect(isValidationError(null)).toBe(false)
  })
})
