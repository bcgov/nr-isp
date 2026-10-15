import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNewlyAddedRowPin } from '@/hooks/useNewlyAddedRowPin'

describe('useNewlyAddedRowPin', () => {
  it('starts with no pinned row', () => {
    const { result } = renderHook(() => useNewlyAddedRowPin())
    expect(result.current.pinnedId).toBeNull()
  })

  it('pins the row matched by the predicate', () => {
    const { result } = renderHook(() => useNewlyAddedRowPin())
    const rows = [
      { id: 'a', code: 'A1' },
      { id: 'b', code: 'B2' },
    ]

    act(() => {
      result.current.pinFromRows(rows, (row) => row.code === 'B2')
    })

    expect(result.current.pinnedId).toBe('b')
  })

  it('clears the pin when no row matches', () => {
    const { result } = renderHook(() => useNewlyAddedRowPin())
    const rows = [{ id: 'a' }, { id: 'b' }]

    act(() => {
      result.current.pinFromRows(rows, (row) => row.id === 'b')
    })
    expect(result.current.pinnedId).toBe('b')

    act(() => {
      result.current.pinFromRows(rows, () => false)
    })
    expect(result.current.pinnedId).toBeNull()
  })

  it('clearPinned resets the pinned id', () => {
    const { result } = renderHook(() => useNewlyAddedRowPin())

    act(() => {
      result.current.pinFromRows([{ id: 'x' }], (row) => row.id === 'x')
    })
    expect(result.current.pinnedId).toBe('x')

    act(() => {
      result.current.clearPinned()
    })
    expect(result.current.pinnedId).toBeNull()
  })

  it('keeps stable callback identities across renders', () => {
    const { result, rerender } = renderHook(() => useNewlyAddedRowPin())
    const firstPinFromRows = result.current.pinFromRows
    const firstClearPinned = result.current.clearPinned

    rerender()

    expect(result.current.pinFromRows).toBe(firstPinFromRows)
    expect(result.current.clearPinned).toBe(firstClearPinned)
  })
})
