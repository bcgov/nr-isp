import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TableCell, Button } from '@carbon/react'
import type {
  EditState,
  TypedDataTableRow,
  DataTableCell,
} from '@/components/common/ReusableDataTable/ReusableDataTable'
import ReusableDataTable from '@/components/common/ReusableDataTable/ReusableDataTable'
import { ValidationError } from '@/utils/validations'

interface Row {
  id: string
  name: string
  amount: string
  [key: string]: unknown
}

const basicHeaders = [
  { key: 'name', header: 'Name', isSortable: true },
  { key: 'amount', header: 'Amount', isSortable: true },
]

const basicRows: Row[] = [
  { id: '1', name: 'Charlie', amount: '10.50' },
  { id: '2', name: 'Alpha', amount: '2.25' },
  { id: '3', name: 'Bravo', amount: '100.00' },
]

const columnTexts = (container: HTMLElement, col: number): string[] =>
  Array.from(container.querySelectorAll('tbody tr')).map(
    (tr) => tr.querySelectorAll('td')[col]?.textContent ?? '',
  )

const makeRows = (count: number): Row[] =>
  Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    name: `Row ${String(i + 1).padStart(2, '0')}`,
    amount: `${i + 1}.50`,
  }))

describe('ReusableDataTable', () => {
  describe('basic rendering', () => {
    it('renders headers and cell values', () => {
      render(<ReusableDataTable headers={basicHeaders} rows={basicRows} />)
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Amount')).toBeInTheDocument()
      expect(screen.getByText('Charlie')).toBeInTheDocument()
      expect(screen.getByText('2.25')).toBeInTheDocument()
    })

    it('uses Carbon zebra striping, which follows the theme', () => {
      const { container } = render(
        <ReusableDataTable headers={basicHeaders} rows={basicRows} showPagination={false} />,
      )
      expect(container.querySelector('table')).toHaveClass('cds--data-table--zebra')
    })

    it('applies getRowClassName to each row', () => {
      const { container } = render(
        <ReusableDataTable
          headers={basicHeaders}
          rows={basicRows}
          getRowClassName={(row) => `row-${row.id}`}
        />,
      )
      expect(container.querySelector('tr.row-1')).toBeInTheDocument()
      expect(container.querySelector('tr.row-3')).toBeInTheDocument()
    })

    it('renders the empty state when a tableState is given and there are no rows', () => {
      render(<ReusableDataTable headers={basicHeaders} rows={[]} tableState="initial" />)
      expect(screen.getByText('No search performed')).toBeInTheDocument()
      // No pagination when the table is empty
      expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument()
    })

    it('renders the addRowButton row and addRowContent row', () => {
      render(
        <ReusableDataTable
          headers={basicHeaders}
          rows={basicRows}
          addRowButton={<Button>Add record</Button>}
          addRowContent={<TableCell colSpan={2}>New row form</TableCell>}
        />,
      )
      expect(screen.getByRole('button', { name: 'Add record' })).toBeInTheDocument()
      expect(screen.getByText('New row form')).toBeInTheDocument()
    })

    it('uses a custom renderCell for columns without a cellType', () => {
      const renderCell = vi.fn((_row: TypedDataTableRow, cell: DataTableCell) => (
        <TableCell key={cell.id} data-testid={`custom-${cell.id}`}>
          custom:{cell.value}
        </TableCell>
      ))
      render(
        <ReusableDataTable
          headers={[{ key: 'name', header: 'Name' }]}
          rows={[{ id: '1', name: 'Charlie' }]}
          renderCell={renderCell}
        />,
      )
      expect(screen.getByText('custom:Charlie')).toBeInTheDocument()
      expect(renderCell).toHaveBeenCalled()
      const [rowArg, cellArg] = renderCell.mock.calls[0]
      expect(rowArg.id).toBe('1')
      expect(cellArg.info.header).toBe('name')
    })

    it('passes a custom sortRow through to the DataTable', () => {
      const sortRow = vi.fn(() => 0)
      render(
        <ReusableDataTable headers={basicHeaders} rows={basicRows} isSortable sortRow={sortRow} />,
      )
      expect(screen.getByText('Charlie')).toBeInTheDocument()
    })
  })

  describe('column alignment', () => {
    it('right-aligns columns whose values are decimals', () => {
      render(<ReusableDataTable headers={basicHeaders} rows={basicRows} />)
      expect(screen.getByText('10.50').closest('td')).toHaveStyle({ textAlign: 'right' })
      expect(screen.getByText('Charlie').closest('td')).toHaveStyle({ textAlign: 'left' })
    })

    it('left-aligns integer-only columns unless explicitly right-aligned', () => {
      render(
        <ReusableDataTable
          headers={[
            { key: 'count', header: 'Count' },
            { key: 'total', header: 'Total', align: 'right' as const },
            { key: 'code', header: 'Code', className: 'right-aligned-header' },
          ]}
          rows={[{ id: '1', count: '5', total: '7', code: 'A1' }]}
        />,
      )
      expect(screen.getByText('5').closest('td')).toHaveStyle({ textAlign: 'left' })
      expect(screen.getByText('7').closest('td')).toHaveStyle({ textAlign: 'right' })
      expect(screen.getByText('A1').closest('td')).toHaveStyle({ textAlign: 'right' })
    })

    it('treats a column with mixed decimal and text values as text (left-aligned)', () => {
      render(
        <ReusableDataTable
          headers={[{ key: 'mixed', header: 'Mixed' }]}
          rows={[
            { id: '1', mixed: '1.5' },
            { id: '2', mixed: 'abc' },
          ]}
        />,
      )
      expect(screen.getByText('1.5').closest('td')).toHaveStyle({ textAlign: 'left' })
    })

    it('strips currency formatting when detecting decimal columns', () => {
      render(
        <ReusableDataTable
          headers={[{ key: 'price', header: 'Price' }]}
          rows={[
            { id: '1', price: '$1,234.56' },
            { id: '2', price: '' },
          ]}
        />,
      )
      expect(screen.getByText('$1,234.56').closest('td')).toHaveStyle({ textAlign: 'right' })
    })
  })

  describe('date cell types', () => {
    it('renders dateDisplay cells in medium format', () => {
      render(
        <ReusableDataTable
          headers={[{ key: 'createdAt', header: 'Created', cellType: 'dateDisplay' as const }]}
          rows={[{ id: '1', createdAt: '2023-06-01' }]}
        />,
      )
      expect(screen.getByText('Jun 1, 2023')).toBeInTheDocument()
    })

    it('renders read-only date cells in medium format, including number[] dates', () => {
      render(
        <ReusableDataTable
          headers={[{ key: 'effectiveDate', header: 'Effective', cellType: 'date' as const }]}
          rows={[
            { id: '1', effectiveDate: '2024-01-15' },
            { id: '2', effectiveDate: [2024, 3, 5] },
          ]}
        />,
      )
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
      expect(screen.getByText('Mar 5, 2024')).toBeInTheDocument()
    })
  })

  describe('client-side sorting', () => {
    it('cycles ASC → DESC → NONE on header clicks and notifies the parent', () => {
      const onSortChange = vi.fn()
      const { container } = render(
        <ReusableDataTable
          headers={basicHeaders}
          rows={basicRows}
          isSortable
          onSortChange={onSortChange}
        />,
      )
      const nameHeader = screen.getByRole('button', { name: /^Name/ })

      fireEvent.click(nameHeader)
      expect(columnTexts(container, 0)).toEqual(['Alpha', 'Bravo', 'Charlie'])
      expect(onSortChange).toHaveBeenLastCalledWith('name', 'ASC')

      fireEvent.click(nameHeader)
      expect(columnTexts(container, 0)).toEqual(['Charlie', 'Bravo', 'Alpha'])
      expect(onSortChange).toHaveBeenLastCalledWith('name', 'DESC')

      fireEvent.click(nameHeader)
      expect(columnTexts(container, 0)).toEqual(['Charlie', 'Alpha', 'Bravo'])
      expect(onSortChange).toHaveBeenLastCalledWith(null, 'NONE')
    })

    it('starts a fresh ASC sort when a different column is clicked', () => {
      const { container } = render(
        <ReusableDataTable headers={basicHeaders} rows={basicRows} isSortable />,
      )
      fireEvent.click(screen.getByRole('button', { name: /^Name/ }))
      fireEvent.click(screen.getByRole('button', { name: /^Amount/ }))
      // Numeric compare: 2.25 < 10.50 < 100.00
      expect(columnTexts(container, 1)).toEqual(['2.25', '10.50', '100.00'])
    })

    it('sorts decimals numerically rather than lexically', () => {
      const rows: Row[] = [
        { id: '1', name: 'a', amount: '0.5' },
        { id: '2', name: 'b', amount: '0.123456789' },
      ]
      const { container } = render(
        <ReusableDataTable headers={basicHeaders} rows={rows} isSortable />,
      )
      fireEvent.click(screen.getByRole('button', { name: /^Amount/ }))
      expect(columnTexts(container, 1)).toEqual(['0.123456789', '0.5'])
    })

    it('falls back to string comparison for non-numeric and empty values', () => {
      const rows: Row[] = [
        { id: '1', name: 'zeta', amount: '' },
        { id: '2', name: 'alpha', amount: '' },
      ]
      const { container } = render(
        <ReusableDataTable headers={basicHeaders} rows={rows} isSortable />,
      )
      fireEvent.click(screen.getByRole('button', { name: /^Name/ }))
      expect(columnTexts(container, 0)).toEqual(['alpha', 'zeta'])
    })

    it('sorts monthYear columns chronologically with string fallback', () => {
      const headers = [
        { key: 'period', header: 'Period', isSortable: true, cellType: 'monthYear' as const },
      ]
      const rows = [
        { id: '1', period: 'Feb 2024' },
        { id: '2', period: 'Jan 2023' },
        { id: '3', period: 'Apr' },
        { id: '4', period: 'zzz' },
      ]
      const { container } = render(<ReusableDataTable headers={headers} rows={rows} isSortable />)
      fireEvent.click(screen.getByRole('button', { name: /^Period/ }))
      const sorted = columnTexts(container, 0)
      // Bare month (year 0) sorts before real years; unparseable falls back to strings
      expect(sorted.indexOf('Apr')).toBeLessThan(sorted.indexOf('Jan 2023'))
      expect(sorted.indexOf('Jan 2023')).toBeLessThan(sorted.indexOf('Feb 2024'))
    })

    it('sorts date columns as dates with string fallback for invalid values', () => {
      const headers = [{ key: 'when', header: 'When', isSortable: true, cellType: 'date' as const }]
      const rows = [
        { id: '1', when: '2024-01-05' },
        { id: '2', when: '2023-12-31' },
        { id: '3', when: 'not-a-date' },
      ]
      const { container } = render(<ReusableDataTable headers={headers} rows={rows} isSortable />)
      fireEvent.click(screen.getByRole('button', { name: /^When/ }))
      const sorted = columnTexts(container, 0)
      expect(sorted.indexOf('Dec 31, 2023')).toBeLessThan(sorted.indexOf('Jan 5, 2024'))
      expect(sorted).toHaveLength(3)
    })

    it('keeps the pinned row first regardless of the active sort', () => {
      const { container } = render(
        <ReusableDataTable headers={basicHeaders} rows={basicRows} isSortable pinnedRowId="1" />,
      )
      fireEvent.click(screen.getByRole('button', { name: /^Name/ }))
      expect(columnTexts(container, 0)).toEqual(['Charlie', 'Alpha', 'Bravo'])
    })

    it('does not sort when clicking a non-sortable header', () => {
      const headers = [
        { key: 'name', header: 'Name' },
        { key: 'amount', header: 'Amount' },
      ]
      const { container } = render(<ReusableDataTable headers={headers} rows={basicRows} />)
      expect(screen.queryByRole('button', { name: /^Name/ })).not.toBeInTheDocument()
      expect(columnTexts(container, 0)).toEqual(['Charlie', 'Alpha', 'Bravo'])
    })
  })

  describe('client-side pagination', () => {
    it('shows only the first page by default and navigates pages', () => {
      const rows = makeRows(15)
      const { container } = render(<ReusableDataTable headers={basicHeaders} rows={rows} />)
      expect(columnTexts(container, 0)).toHaveLength(10)
      expect(screen.getByText('Row 01')).toBeInTheDocument()
      expect(screen.queryByText('Row 11')).not.toBeInTheDocument()

      fireEvent.click(screen.getAllByRole('button', { name: /next page/i })[0])
      expect(columnTexts(container, 0)).toHaveLength(5)
      expect(screen.getByText('Row 11')).toBeInTheDocument()
      expect(screen.queryByText('Row 01')).not.toBeInTheDocument()
    })

    it('changes the page size', () => {
      const rows = makeRows(15)
      const { container } = render(<ReusableDataTable headers={basicHeaders} rows={rows} />)
      const pageSizeSelect = screen.getAllByLabelText(/items per page/i)[0]
      fireEvent.change(pageSizeSelect, { target: { value: '25' } })
      expect(columnTexts(container, 0)).toHaveLength(15)
    })

    it('renders every row when showPagination is false', () => {
      const rows = makeRows(15)
      const { container } = render(
        <ReusableDataTable headers={basicHeaders} rows={rows} showPagination={false} />,
      )
      expect(columnTexts(container, 0)).toHaveLength(15)
      expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument()
    })

    it('resets to page 1 when the row membership changes', () => {
      const rows = makeRows(15)
      const { rerender } = render(<ReusableDataTable headers={basicHeaders} rows={rows} />)
      fireEvent.click(screen.getAllByRole('button', { name: /next page/i })[0])
      expect(screen.getByText('Row 11')).toBeInTheDocument()

      rerender(<ReusableDataTable headers={basicHeaders} rows={makeRows(16)} />)
      expect(screen.getByText('Row 01')).toBeInTheDocument()
      expect(screen.queryByText('Row 11')).not.toBeInTheDocument()
    })

    it('keeps the current page when the same rows come back in a different order', () => {
      const rows = makeRows(15)
      const { rerender } = render(<ReusableDataTable headers={basicHeaders} rows={rows} />)
      fireEvent.click(screen.getAllByRole('button', { name: /next page/i })[0])
      expect(screen.getByText('Row 11')).toBeInTheDocument()

      rerender(<ReusableDataTable headers={basicHeaders} rows={[...rows].reverse()} />)
      // Same id set → same page (page 2)
      expect(screen.queryByText('Row 11')).not.toBeInTheDocument()
      expect(screen.getByText('Row 05')).toBeInTheDocument()
    })
  })

  describe('server mode', () => {
    const serverProps = {
      paginationMode: 'server' as const,
      serverPage: 2,
      serverPageSize: 10,
      serverTotalItems: 30,
    }

    it('renders rows as-is and never sorts client-side', () => {
      const { container } = render(
        <ReusableDataTable
          headers={basicHeaders}
          rows={basicRows}
          isSortable
          {...serverProps}
          serverSortKey="name"
          serverSortDirection="ASC"
        />,
      )
      expect(columnTexts(container, 0)).toEqual(['Charlie', 'Alpha', 'Bravo'])
    })

    it('reports pagination changes to the parent instead of paginating locally', () => {
      const onPaginationChange = vi.fn()
      render(
        <ReusableDataTable
          headers={basicHeaders}
          rows={basicRows}
          {...serverProps}
          onPaginationChange={onPaginationChange}
        />,
      )
      fireEvent.click(screen.getAllByRole('button', { name: /next page/i })[0])
      expect(onPaginationChange).toHaveBeenCalledWith(3, 10)
    })

    it('reports sort changes based on the server sort state', () => {
      const onSortChange = vi.fn()
      const { rerender } = render(
        <ReusableDataTable
          headers={basicHeaders}
          rows={basicRows}
          isSortable
          {...serverProps}
          onSortChange={onSortChange}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /^Name/ }))
      expect(onSortChange).toHaveBeenLastCalledWith('name', 'ASC')

      rerender(
        <ReusableDataTable
          headers={basicHeaders}
          rows={basicRows}
          isSortable
          {...serverProps}
          serverSortKey="name"
          serverSortDirection="ASC"
          onSortChange={onSortChange}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /^Name/ }))
      expect(onSortChange).toHaveBeenLastCalledWith('name', 'DESC')

      rerender(
        <ReusableDataTable
          headers={basicHeaders}
          rows={basicRows}
          isSortable
          {...serverProps}
          serverSortKey="name"
          serverSortDirection="DESC"
          onSortChange={onSortChange}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /^Name/ }))
      expect(onSortChange).toHaveBeenLastCalledWith(null, 'NONE')
    })

    it('falls back to defaults when server pagination props are omitted', () => {
      const onPaginationChange = vi.fn()
      render(
        <ReusableDataTable
          headers={basicHeaders}
          rows={basicRows}
          paginationMode="server"
          onPaginationChange={onPaginationChange}
        />,
      )
      // totalItems defaults to 0, page to 1 — pagination still renders
      expect(screen.getAllByText(/items per page/i).length).toBeGreaterThan(0)
    })
  })

  describe('actions column', () => {
    const actionHeaders = [
      { key: 'name', header: 'Name' },
      { key: 'effectiveDate', header: 'Effective', cellType: 'date' as const },
      { key: 'actions', header: 'Actions', cellType: 'actions' as const },
    ]
    const actionRows = [{ id: '1', name: 'Charlie', effectiveDate: '2024-01-15', actions: '' }]

    interface HarnessProps {
      onSave?: (row: (typeof actionRows)[number]) => Promise<void>
      onDelete?: (row: (typeof actionRows)[number]) => void | Promise<void>
      showEdit?: boolean
      showDelete?: boolean
      showDeleteFirst?: boolean
      deleteConfirmationText?: string
      rows?: typeof actionRows
    }

    const EditHarness: React.FC<HarnessProps> = ({ rows = actionRows, ...actionsConfig }) => {
      const [editingRowIds, setEditingRowIds] = React.useState<Set<string>>(() => new Set())
      const [editedValues, setEditedValues] = React.useState<
        Record<string, Partial<(typeof actionRows)[number]>>
      >({})
      const editState: EditState<(typeof actionRows)[number]> = {
        editingRowIds,
        editedValues,
        setEditingRowIds,
        setEditedValues,
      }
      return (
        <ReusableDataTable
          headers={actionHeaders}
          rows={rows}
          editState={editState}
          actionsConfig={actionsConfig}
        />
      )
    }

    it('hides the actions header text', () => {
      render(<EditHarness />)
      expect(screen.queryByText('Actions')).not.toBeInTheDocument()
    })

    it('shows Edit and Delete buttons, and honors showEdit/showDelete flags', () => {
      const { rerender } = render(<EditHarness />)
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()

      rerender(<EditHarness showEdit={false} />)
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()

      rerender(<EditHarness showDelete={false} />)
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    })

    it('enters edit mode showing Save, Cancel and Delete plus a date picker', async () => {
      render(<EditHarness />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
      expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('YYYY-MM-DD')).toBeInTheDocument()
    })

    it('orders Delete before Cancel when showDeleteFirst is set', async () => {
      render(<EditHarness showDeleteFirst />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
      await screen.findByRole('button', { name: 'Save' })
      const cell = screen.getByRole('button', { name: 'Save' }).closest('td') as HTMLElement
      const save = within(cell).getByRole('button', { name: 'Save' })
      const del = within(cell).getByRole('button', { name: 'Delete' })
      const cancel = within(cell).getByRole('button', { name: 'Cancel' })
      expect(save.compareDocumentPosition(del) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(del.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('saves the edited row and exits edit mode', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      render(<EditHarness onSave={onSave} />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Save' }))
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
      expect(onSave).toHaveBeenCalledWith({
        id: '1',
        name: 'Charlie',
        effectiveDate: '2024-01-15',
        actions: '',
      })
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument(),
      )
    })

    it('saves the date edited via the date picker', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      render(<EditHarness onSave={onSave} />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
      const dateInput = await screen.findByPlaceholderText('YYYY-MM-DD')
      fireEvent.change(dateInput, { target: { value: '2024-02-20' } })
      fireEvent.blur(dateInput)
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
      expect(onSave.mock.calls[0][0].effectiveDate).toBe('2024-02-20')
    })

    it('keeps the row in edit mode when save fails validation', async () => {
      const onSave = vi.fn().mockRejectedValue(new ValidationError('bad input'))
      render(<EditHarness onSave={onSave} />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Save' }))
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
      // Still editing
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('logs and stays in edit mode when save fails with an unexpected error', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('boom'))
      render(<EditHarness onSave={onSave} />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Save' }))
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('cancels editing without saving', async () => {
      const onSave = vi.fn()
      render(<EditHarness onSave={onSave} />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument(),
      )
      expect(onSave).not.toHaveBeenCalled()
    })

    it('confirms deletion through the modal before calling onDelete', async () => {
      const onDelete = vi.fn()
      render(<EditHarness onDelete={onDelete} />)
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      expect(screen.getByText('Are you sure you want to delete this record?')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
      await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1))
      expect(onDelete).toHaveBeenCalledWith({
        id: '1',
        name: 'Charlie',
        effectiveDate: '2024-01-15',
        actions: '',
      })
    })

    it('shows a custom delete confirmation message', () => {
      render(<EditHarness onDelete={vi.fn()} deleteConfirmationText="Really remove this mill?" />)
      expect(screen.getByText('Really remove this mill?')).toBeInTheDocument()
    })

    it('does not delete when the modal is dismissed with No', async () => {
      const onDelete = vi.fn()
      render(<EditHarness onDelete={onDelete} />)
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      fireEvent.click(screen.getByRole('button', { name: 'No' }))
      // Confirming after dismissal is a no-op because rowToDelete was cleared
      fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
      await waitFor(() => expect(onDelete).not.toHaveBeenCalled())
    })

    it('opens the delete confirmation from within edit mode', async () => {
      const onDelete = vi.fn()
      render(<EditHarness onDelete={onDelete} />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
      await screen.findByRole('button', { name: 'Save' })
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
      await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1))
    })

    it('tolerates an async onDelete that rejects', async () => {
      const onDelete = vi.fn().mockRejectedValue(new Error('delete failed'))
      render(<EditHarness onDelete={onDelete} />)
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
      await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1))
      // No crash — table still rendered
      expect(screen.getByText('Charlie')).toBeInTheDocument()
    })
  })
})
