import { useCallback, useState } from 'react'

interface RowWithId {
  id: string
}

/**
 * Tracks the id of a just-added row so it can be pinned to the top of a `ReusableDataTable`
 * (via its `pinnedRowId` prop) until the user takes control of sort order.
 */
export function useNewlyAddedRowPin() {
  const [pinnedId, setPinnedId] = useState<string | null>(null)

  // Takes the freshly-refetched rows and a predicate identifying the one that was just added,
  // rather than a value captured at hook-creation time, so callers always match against the
  // payload/row shape available at the point the add actually completes.
  const pinFromRows = useCallback(
    <T extends RowWithId>(rows: T[], matches: (row: T) => boolean) => {
      const match = rows.find(matches)
      setPinnedId(match ? match.id : null)
    },
    [],
  )

  const clearPinned = useCallback(() => setPinnedId(null), [])

  return { pinnedId, pinFromRows, clearPinned } as const
}
