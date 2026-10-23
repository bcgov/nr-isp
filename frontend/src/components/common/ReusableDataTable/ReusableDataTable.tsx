import React from 'react'
import type { DataTableHeader } from '@carbon/react'
import {
  DataTable,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  Button,
  DatePicker,
  DatePickerInput,
  Pagination,
  Modal,
} from '@carbon/react'
import { Edit, TrashCan, Save, Close } from '@carbon/icons-react'
import './ReusableDataTable.scss'
import TableEmptyState, {
  type TableStateType,
} from '@/components/common/TableEmptyState/TableEmptyState'
import { parseMonthYearToSortValue } from '@/utils/tableSortUtils'
import { formatDateMedium } from '@/utils/dateFormatter'
import { isValidationError } from '@/utils/validations'

// Base type for table rows - just requires an id
interface TableRowWithId {
  id: string
}

export interface CellInfo {
  header: string
}

export interface DataTableCell {
  id: string
  value: string | React.ReactNode
  info: CellInfo
}

// Typed row interface to avoid `any` from Carbon's DataTableRow
export interface TypedDataTableRow {
  id: string
  cells: DataTableCell[]
}

export type CellType = 'text' | 'date' | 'dateDisplay' | 'actions' | 'custom' | 'monthYear'

export interface EditState<T> {
  editingRowIds: Set<string>
  editedValues: Record<string, Partial<T>>
  setEditingRowIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  setEditedValues: (
    values:
      | Record<string, Partial<T>>
      | ((prev: Record<string, Partial<T>>) => Record<string, Partial<T>>),
  ) => void
}

export interface ActionsConfig<T> {
  onSave?: (row: T) => Promise<void>
  /** May be async — the table awaits it so a failed delete can surface a message. */
  onDelete?: (row: T) => void | Promise<void>
  showEdit?: boolean
  showDelete?: boolean
  showDeleteFirst?: boolean
  deleteConfirmationText?: string
}

interface ReusableDataTableProps<T extends TableRowWithId> {
  headers: (DataTableHeader & {
    isSortable?: boolean
    cellType?: CellType
    className?: string
    align?: 'left' | 'center' | 'right'
  })[]
  rows: T[]
  isSortable?: boolean

  sortRow?: (
    cellA: any,
    cellB: any,
    options: { sortDirection: string; sortStates: object; key: string },
  ) => number
  renderCell?: (row: TypedDataTableRow, cell: DataTableCell) => React.ReactNode
  getRowClassName?: (row: TypedDataTableRow) => string
  editState?: EditState<T>
  actionsConfig?: ActionsConfig<T>
  addRowButton?: React.ReactNode
  addRowContent?: React.ReactNode
  tableState?: TableStateType
  showPagination?: boolean
  // Pagination/sort mode. 'client' (default), 'server' means the parent fetches one page at a time and
  // drives pagination + sort — this component then renders `rows` as-is and
  // reports page/sort changes back through the callbacks below.
  paginationMode?: 'client' | 'server'
  // --- server mode only ---
  serverPage?: number // 1-based index of the page currently shown
  serverPageSize?: number
  serverTotalItems?: number
  onPaginationChange?: (page: number, pageSize: number) => void
  serverSortKey?: string | null
  serverSortDirection?: 'ASC' | 'DESC' | 'NONE'
  onSortChange?: (key: string | null, direction: 'ASC' | 'DESC' | 'NONE') => void
  // When set to the id of a row present in `rows`, that row is always rendered first —
  // ahead of any active sort or the natural order of `rows` — so it stays visible on page 1
  // right after it's added, regardless of how the table is currently sorted.
  pinnedRowId?: string | null
}

export type { TableStateType }

const formatDate = (date: string | number[]): string => {
  if (!date) return ''
  if (typeof date === 'string') return date
  const [year, month, day] = date
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const ReusableDataTable = <T extends TableRowWithId>({
  headers,
  rows,
  isSortable = false,
  sortRow,
  renderCell,
  getRowClassName,
  editState,
  actionsConfig,
  addRowButton,
  addRowContent,
  tableState,
  showPagination = true,
  paginationMode = 'client',
  serverPage,
  serverPageSize,
  serverTotalItems,
  onPaginationChange,
  serverSortKey,
  serverSortDirection,
  onSortChange,
  pinnedRowId,
}: ReusableDataTableProps<T>) => {
  const isServer = paginationMode === 'server'

  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  // Sort state managed externally so sorting applies to the full dataset
  const [internalSortKey, setInternalSortKey] = React.useState<string | null>(null)
  const [internalSortDirection, setInternalSortDirection] = React.useState<'ASC' | 'DESC' | 'NONE'>(
    'NONE',
  )

  // In server mode the parent owns page and sort state; in client mode we use
  // the local state above. Everything downstream reads these effective values.
  const sortKey = isServer ? (serverSortKey ?? null) : internalSortKey
  const sortDirection = isServer ? (serverSortDirection ?? 'NONE') : internalSortDirection

  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [rowToDelete, setRowToDelete] = React.useState<T | null>(null)

  // Reset to the first page when the underlying dataset membership changes
  // (e.g. the user applies a new filter), but keep the current page when the user
  // merely re-sorts (sorting is internal and never changes the `rows` prop) or
  // edits a row in place (same set of row ids). Membership is compared as an
  // order-independent set of ids, so a re-fetch returning the same rows in a
  // different order does not bounce the user back to page 1.
  const rowIdsKey = React.useMemo(() => [...rows.map((r) => r.id)].sort().join('|'), [rows])
  const [pagedRowIdsKey, setPagedRowIdsKey] = React.useState(rowIdsKey)
  if (rowIdsKey !== pagedRowIdsKey) {
    setPagedRowIdsKey(rowIdsKey)
    // In server mode the parent controls the current page, so never bounce it here.
    if (!isServer) {
      setCurrentPage(1)
    }
  }

  // Sort the full rows array before paginating. In server mode the rows are
  // already the correct page in the correct order, so leave them untouched.
  const sortedRows = React.useMemo(() => {
    const pinnedRow = pinnedRowId ? rows.find((r) => r.id === pinnedRowId) : undefined
    const rest = pinnedRow ? rows.filter((r) => r.id !== pinnedRowId) : rows

    const sortRest = (): T[] => {
      if (isServer) return rest
      if (!sortKey || sortDirection === 'NONE') return rest

      const sortHeader = headers.find((h) => h.key === sortKey)
      const cellType = sortHeader?.cellType

      return [...rest].sort((a, b) => {
        const aRaw = (a as Record<string, unknown>)[sortKey] ?? ''
        const bRaw = (b as Record<string, unknown>)[sortKey] ?? ''
        const aVal = String(aRaw)
        const bVal = String(bRaw)

        let cmp: number

        if (cellType === 'monthYear') {
          const aNum = parseMonthYearToSortValue(aVal)
          const bNum = parseMonthYearToSortValue(bVal)
          if (!isNaN(aNum) && !isNaN(bNum)) {
            cmp = aNum - bNum
          } else {
            // Fall back to string compare when parsing fails
            cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
          }
        } else if (cellType === 'date' || cellType === 'dateDisplay') {
          // date columns use YYYY-MM-DD or number[] format – compare as dates
          const aDate = new Date(formatDate(aVal)).getTime()
          const bDate = new Date(formatDate(bVal)).getTime()
          if (!isNaN(aDate) && !isNaN(bDate)) {
            cmp = aDate - bDate
          } else {
            cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
          }
        } else {
          // Numeric comparison for number-typed values (e.g. decimal factors).
          // localeCompare with numeric:true compares digit sequences as integers,
          // which sorts "0.5" before "0.123456789" (5 < 123456789) — wrong for decimals.
          const aNum = typeof aRaw === 'number' ? aRaw : Number(aVal)
          const bNum = typeof bRaw === 'number' ? bRaw : Number(bVal)
          if (!isNaN(aNum) && !isNaN(bNum) && aVal !== '' && bVal !== '') {
            cmp = aNum - bNum
          } else {
            cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
          }
        }

        return sortDirection === 'ASC' ? cmp : -cmp
      })
    }

    const result = sortRest()
    return pinnedRow ? [pinnedRow, ...result] : result
  }, [rows, sortKey, sortDirection, headers, isServer, pinnedRowId])

  // Calculate which rows to show. In server mode the rows already are the
  // current page, so render them all; in client mode slice the sorted set.
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedRows =
    isServer || !showPagination ? sortedRows : sortedRows.slice(startIndex, endIndex)

  // Detect "decimal" columns from the row data. A column counts as decimal
  // when every non-empty value is numeric and at least one value has a decimal
  // point (e.g. prices, factors, volumes). Decimal columns are right-aligned;
  // all other columns (text, codes, ids, dates) are left-aligned.
  const decimalColumns = React.useMemo(() => {
    const classify = (v: unknown): 'decimal' | 'int' | 'other' | null => {
      if (v === null || v === undefined || v === '') return null
      if (typeof v !== 'string' && typeof v !== 'number') return 'other'
      const s = String(v)
        .trim()
        .replace(/[$,%\s]/g, '')
      if (/^-?\d+\.\d+$/.test(s)) return 'decimal'
      if (/^-?\d+$/.test(s)) return 'int'
      return 'other'
    }
    const set = new Set<string>()
    for (const h of headers) {
      let sawDecimal = false
      let sawOther = false
      let sawAny = false
      for (const r of rows) {
        const t = classify((r as Record<string, unknown>)[h.key])
        if (t === null) continue
        sawAny = true
        if (t === 'decimal') sawDecimal = true
        else if (t === 'other') {
          sawOther = true
          break
        }
      }
      if (sawAny && sawDecimal && !sawOther) set.add(h.key)
    }
    return set
  }, [headers, rows])

  // A column is right-aligned when it holds decimals (detected from the data)
  // or the caller explicitly marked it right (align: 'right' / right-aligned-header,
  // used for numeric columns that may currently hold integer-only data).
  // Everything else is left-aligned.
  const isRightAlignedColumn = (h: { key: string; align?: string; className?: string }): boolean =>
    decimalColumns.has(h.key) || h.align === 'right' || h.className === 'right-aligned-header'

  const renderDefaultCell = (
    row: TypedDataTableRow,
    cell: DataTableCell,
    header: DataTableHeader & { cellType?: CellType },
  ): React.ReactNode => {
    const rowId = row.id
    const originalRow = rows.find((r) => r.id === rowId)
    const isEditing = editState?.editingRowIds.has(rowId) ?? false

    // Handle actions column
    if (header.cellType === 'actions' && actionsConfig) {
      const showEdit = actionsConfig.showEdit !== false
      const showDelete = actionsConfig.showDelete !== false

      if (isEditing) {
        const saveButton = showEdit && (
          <Button
            hasIconOnly
            renderIcon={Save}
            iconDescription="Save"
            kind="ghost"
            size="sm"
            onClick={(): void => {
              if (originalRow && actionsConfig.onSave && editState) {
                void actionsConfig
                  .onSave({ ...originalRow, ...editState.editedValues[rowId] })
                  .then(() => {
                    editState.setEditingRowIds((prev) => {
                      const newSet = new Set(prev)
                      newSet.delete(rowId)
                      return newSet
                    })
                    editState.setEditedValues((prev) => {
                      const newValues = { ...prev }
                      delete newValues[rowId]
                      return newValues
                    })
                  })
                  .catch((error) => {
                    // Validation failures are expected control flow: the handler has
                    // already shown the message, and the row deliberately stays in edit
                    // mode so the user keeps what they typed. Only log genuine faults.
                    if (!isValidationError(error)) {
                      console.error('Error saving row:', error)
                    }
                  })
              }
            }}
          />
        )

        const cancelButton = showEdit && (
          <Button
            hasIconOnly
            renderIcon={Close}
            iconDescription="Cancel"
            kind="ghost"
            size="sm"
            onClick={(): void => {
              if (editState) {
                editState.setEditingRowIds((prev) => {
                  const newSet = new Set(prev)
                  newSet.delete(rowId)
                  return newSet
                })
                editState.setEditedValues((prev) => {
                  const newValues = { ...prev }
                  delete newValues[rowId]
                  return newValues
                })
              }
            }}
          />
        )

        const deleteButton = showDelete && (
          <Button
            hasIconOnly
            renderIcon={TrashCan}
            iconDescription="Delete"
            kind="danger--ghost"
            size="sm"
            onClick={(): void => {
              if (originalRow) {
                setRowToDelete(originalRow)
                setIsDeleteModalOpen(true)
              }
            }}
          />
        )

        const buttons = actionsConfig.showDeleteFirst
          ? [saveButton, deleteButton, cancelButton]
          : [saveButton, cancelButton, deleteButton]

        return <TableCell key={cell.id}>{buttons}</TableCell>
      }

      return (
        <TableCell key={cell.id}>
          <>
            {showEdit && (
              <Button
                hasIconOnly
                renderIcon={Edit}
                iconDescription="Edit"
                kind="ghost"
                size="sm"
                onClick={(): void => {
                  if (editState && originalRow) {
                    editState.setEditingRowIds((prev) => new Set(prev).add(rowId))
                    editState.setEditedValues((prev) => ({
                      ...prev,
                      [rowId]: originalRow,
                    }))
                  }
                }}
              />
            )}
            {showDelete && (
              <Button
                hasIconOnly
                renderIcon={TrashCan}
                iconDescription="Delete"
                kind="ghost"
                size="sm"
                onClick={(): void => {
                  if (originalRow) {
                    setRowToDelete(originalRow)
                    setIsDeleteModalOpen(true)
                  }
                }}
              />
            )}
          </>
        </TableCell>
      )
    }

    // Handle read-only date column (e.g. audit timestamps). Never editable;
    // displays the medium 'Jan 1, 2026' form while the stored value stays ISO
    // so date sorting keeps working.
    if (header.cellType === 'dateDisplay') {
      return (
        <TableCell key={cell.id} style={{ textAlign: 'left' }}>
          <span>{formatDateMedium((cell.value as string | number[]) || '')}</span>
        </TableCell>
      )
    }

    // Handle date column
    if (header.cellType === 'date') {
      const fieldName = header.key
      const editedRowValue =
        isEditing && editState && editState.editedValues[rowId]
          ? (editState.editedValues[rowId][fieldName as keyof T] as string | number[] | undefined)
          : undefined
      const currentValue: string | number[] = editedRowValue ?? (cell.value as string)
      const formattedDate = formatDate(currentValue || '')

      return (
        <TableCell key={cell.id} style={{ textAlign: 'left' }}>
          {isEditing && editState ? (
            <DatePicker
              datePickerType="single"
              dateFormat="Y-m-d"
              value={formattedDate}
              onChange={(dates: Date[]): void => {
                if (dates && dates.length > 0 && editState) {
                  const date = dates[0]
                  const year = date.getFullYear()
                  const month = String(date.getMonth() + 1).padStart(2, '0')
                  const day = String(date.getDate()).padStart(2, '0')
                  const newDate = `${year}-${month}-${day}`
                  editState.setEditedValues((prev) => ({
                    ...prev,
                    [rowId]: {
                      ...prev[rowId],
                      [fieldName]: newDate,
                    },
                  }))
                }
              }}
            >
              <DatePickerInput
                id={`${cell.id}-date`}
                placeholder="YYYY-MM-DD"
                labelText=""
                size="sm"
                defaultValue={formattedDate}
              />
            </DatePicker>
          ) : (
            // Display read-only dates in the medium 'Jan 1, 2026' form; the
            // edited/stored value (formattedDate) stays ISO for the DatePicker,
            // sorting, validation, and save payloads.
            <span>{formatDateMedium(currentValue || '')}</span>
          )}
        </TableCell>
      )
    }

    // Default text rendering — decimal/numeric columns right-aligned, everything else left.
    const align: 'left' | 'right' = isRightAlignedColumn(header) ? 'right' : 'left'
    return (
      <TableCell key={cell.id} style={{ textAlign: align }}>
        {cell.value}
      </TableCell>
    )
  }

  const handleDeleteConfirm = (): void => {
    const row = rowToDelete
    setIsDeleteModalOpen(false)
    setRowToDelete(null)

    if (!row || !actionsConfig?.onDelete) return

    // Awaited so an async delete handler can surface its own failure. Previously the
    // call was fire-and-forget and a rejected delete left the user with no feedback.
    void Promise.resolve(actionsConfig.onDelete(row)).catch((error) => {
      console.error('Error deleting row:', error)
    })
  }

  const paginationProps = {
    page: isServer ? (serverPage ?? 1) : currentPage,
    pageSize: isServer ? (serverPageSize ?? 10) : pageSize,
    pageSizes: [10, 25, 50, 100] as number[],
    totalItems: isServer ? (serverTotalItems ?? 0) : rows.length,
    onChange: ({ page, pageSize: newPageSize }: { page: number; pageSize: number }): void => {
      if (isServer) {
        onPaginationChange?.(page, newPageSize)
      } else {
        setCurrentPage(page)
        setPageSize(newPageSize)
      }
    },
  }

  return (
    <>
      {showPagination && rows.length > 0 && <Pagination {...paginationProps} />}
      <DataTable
        rows={paginatedRows}
        headers={headers}
        isSortable={isSortable}
        {...(sortRow ? { sortRow } : {})}
        render={({ rows: dataTableRows, getHeaderProps, getRowProps, getTableProps }) => (
          <TableContainer className="reusable-table-container">
            <Table {...getTableProps()} useZebraStyles>
              <TableHead>
                <TableRow>
                  {headers.map((header) => {
                    const isActionsColumn = header.key === 'actions'
                    // Headers are always left-aligned (UI-ALIGN-3). Cell alignment is separate.
                    const alignClass = isActionsColumn
                      ? header.className || ''
                      : 'left-aligned-header'
                    // onClick, isSortHeader and sortDirection are replaced below, so sorting
                    // follows this component's state rather than Carbon's own.
                    const { key, ...restHeaderProps } = getHeaderProps({
                      header,
                      isSortable: isActionsColumn ? false : header.isSortable,
                      className: alignClass,
                    })
                    const isSortableHeader = !isActionsColumn && !!header.isSortable
                    const handleHeaderClick = !isSortableHeader
                      ? undefined
                      : (e: React.MouseEvent<HTMLButtonElement>): void => {
                          e.preventDefault()
                          // Drive external sort state. In client mode this spans the full
                          // dataset; in server mode the parent re-fetches the sorted page.
                          const nextDirection =
                            sortKey !== header.key
                              ? 'ASC'
                              : sortDirection === 'ASC'
                                ? 'DESC'
                                : sortDirection === 'DESC'
                                  ? 'NONE'
                                  : 'ASC'
                          const nextKey = nextDirection === 'NONE' ? null : header.key
                          if (isServer) {
                            onSortChange?.(nextKey, nextDirection)
                          } else {
                            setInternalSortKey(nextKey)
                            setInternalSortDirection(nextDirection)
                            // Client mode owns sort state internally, but still notify the
                            // parent (e.g. so it can clear a pinned newly-added row once the
                            // user takes control of ordering).
                            onSortChange?.(nextKey, nextDirection)
                          }
                        }
                    return (
                      <TableHeader
                        key={key}
                        {...restHeaderProps}
                        onClick={handleHeaderClick}
                        isSortHeader={sortKey === header.key && sortDirection !== 'NONE'}
                        sortDirection={sortKey === header.key ? sortDirection : 'NONE'}
                      >
                        {header.key === 'actions' ? '' : header.header}
                      </TableHeader>
                    )
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {addRowButton && (
                  <TableRow>
                    <TableCell colSpan={headers.length}>{addRowButton}</TableCell>
                  </TableRow>
                )}
                {addRowContent && <TableRow>{addRowContent}</TableRow>}
                {tableState && paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={headers.length} style={{ padding: 0, border: 'none' }}>
                      <TableEmptyState tableState={tableState} />
                    </TableCell>
                  </TableRow>
                ) : (
                  dataTableRows.map((row) => {
                    const typedRow = row as TypedDataTableRow
                    const { key, ...rowProps } = getRowProps({ row })
                    return (
                      <TableRow
                        key={key}
                        {...rowProps}
                        className={getRowClassName ? getRowClassName(typedRow) : ''}
                      >
                        {typedRow.cells.map((cell) => {
                          const header = headers.find((h) => h.key === cell.info.header)

                          // Use custom renderCell if provided and cellType is custom, monthYear, or not specified
                          if (
                            renderCell &&
                            (!header?.cellType ||
                              header.cellType === 'custom' ||
                              header.cellType === 'monthYear')
                          ) {
                            return renderCell(typedRow, cell)
                          }

                          // Otherwise use default renderers
                          return renderDefaultCell(
                            typedRow,
                            cell,
                            header || {
                              key: cell.info.header,
                              header: cell.info.header,
                            },
                          )
                        })}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      />
      {showPagination && rows.length > 0 && <Pagination {...paginationProps} />}
      <Modal
        modalHeading="Confirmation"
        primaryButtonText="Yes"
        secondaryButtonText="No"
        size="sm"
        open={isDeleteModalOpen}
        onRequestClose={(): void => {
          setIsDeleteModalOpen(false)
          setRowToDelete(null)
        }}
        onRequestSubmit={handleDeleteConfirm}
      >
        <p>
          {actionsConfig?.deleteConfirmationText || 'Are you sure you want to delete this record?'}
        </p>
      </Modal>
    </>
  )
}

export default ReusableDataTable
