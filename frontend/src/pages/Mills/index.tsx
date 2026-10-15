import { Add, Checkmark, Close, Subtract } from '@carbon/icons-react'
import {
  Button,
  Column,
  DatePicker,
  DatePickerInput,
  Form,
  Grid,
  TableCell,
  TextInput,
  type DataTableHeader,
} from '@carbon/react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import ClearButton from '@/components/common/ClearButton/ClearButton'
import Dropdown from '@/components/common/Dropdown/Dropdown'
import ExportButtons from '@/components/common/ExportButtons/ExportButtons'
import MultiSelectWithTags from '@/components/common/MultiSelectWithTags/MultiSelectWithTags'
import PageNotifications from '@/components/common/PageNotifications/PageNotifications'
import ReusableDataTable, {
  type ActionsConfig,
  type CellType,
  type DataTableCell,
  type EditState,
  type TypedDataTableRow,
} from '@/components/common/ReusableDataTable/ReusableDataTable'
import SearchButton from '@/components/common/SearchButton/SearchButton'
import { useAuth } from '@/context/auth/useAuth'
import { useNotifications } from '@/context/notification/useNotifications'
import { useNewlyAddedRowPin } from '@/hooks/useNewlyAddedRowPin'
import { useScrollToTopOnError } from '@/hooks/useScrollToTopOnError'
import type { MillModel, MillRow } from '@/interfaces/Mill'
import {
  deleteMill,
  exportMills,
  getIspSellPriceZoneCodes,
  getMills,
  saveMill,
} from '@/service/mills-service'
import { toIsoLocalDate } from '@/utils/dateFormatter'
import {
  ValidationError,
  filterIntegerInput,
  validateDateRange,
  validateNoDuplicate,
} from '@/utils/validations'
import './Mills.scss'

type Zone = { code: string; description?: string }

const headers: (DataTableHeader & {
  isSortable?: boolean
  cellType?: CellType
  className?: string
  align?: 'left' | 'center' | 'right'
})[] = [
  { key: 'millNumber', header: 'Mill Number', isSortable: true, align: 'left' },
  { key: 'millName', header: 'Mill Name', isSortable: true, cellType: 'custom' },
  {
    key: 'ispSellPriceZoneCode',
    header: 'Zone',
    isSortable: true,
    cellType: 'custom',
    align: 'left',
  },
  { key: 'clientNumber', header: 'Client No', isSortable: true, cellType: 'custom', align: 'left' },
  {
    key: 'clientLocnCode',
    header: 'Client Loc',
    isSortable: true,
    cellType: 'custom',
    align: 'left',
  },
  { key: 'comments', header: 'Comments', isSortable: true, cellType: 'custom' },
  { key: 'effectiveDate', header: 'Effective Date', isSortable: true, cellType: 'date' },
  { key: 'expiryDate', header: 'Expiry Date', isSortable: true, cellType: 'date' },
  { key: 'updateTimestamp', header: 'Update Date', isSortable: true, cellType: 'dateDisplay' },
  { key: 'updateUserid', header: 'Update Id', isSortable: true, cellType: 'text', align: 'left' },
  { key: 'actions', header: '', cellType: 'actions' },
]

/** Inline-editable text columns and their MILL column lengths. */
const TEXT_FIELD_MAX_LENGTH: Partial<Record<keyof MillRow, number>> = {
  millName: 100,
  clientNumber: 8,
  clientLocnCode: 2,
  comments: 4000,
}

const ACTIVE_OPTIONS = [
  { id: '', text: 'Select...' },
  { id: 'active', text: 'Active' },
  { id: 'inactive', text: 'Inactive' },
]

const NO_ZONE: Zone = { code: '', description: 'Select...' }

// Matches the id ReusableDataTable rows are keyed by (see rowsToDisplay below), so a just-saved
// mill can be found in refetched data using the same identity the table itself uses.
const millRowId = (mill: MillModel): string => String(mill.millId || mill.millNumber)

/** The API sends ISO dates and date-times; the page works with YYYY-MM-DD. */
const toDateOnly = (value?: string): string | undefined => value?.split('T')[0]

const loadMills = async (): Promise<MillModel[]> =>
  (await getMills()).map((mill) => ({
    ...mill,
    effectiveDate: toDateOnly(mill.effectiveDate),
    expiryDate: toDateOnly(mill.expiryDate),
    updateTimestamp: toDateOnly(mill.updateTimestamp),
  }))

const RequiredLabel = ({ children }: { children: ReactNode }) => (
  <strong>
    {children} <span className="required-asterisk">*</span>
  </strong>
)

/** Mill names maintenance, ported from the CGI rebuild's MillsPage. */
const MillsPage = () => {
  const { isAdmin: canWrite } = useAuth()
  const [mills, setMills] = useState<MillModel[]>([])
  const [zones, setZones] = useState<Zone[]>([])

  const [selectedMillNumbers, setSelectedMillNumbers] = useState<string[]>([])
  const [selectedMillNames, setSelectedMillNames] = useState<string[]>([])
  const [selectedZones, setSelectedZones] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const [filtered, setFiltered] = useState<MillModel[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newRow, setNewRow] = useState<Partial<MillModel>>({})

  const [editingRowIds, setEditingRowIds] = useState(() => new Set<string>())
  const [editedValues, setEditedValues] = useState<Record<string, Partial<MillRow>>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const { pinnedId: justAddedId, pinFromRows, clearPinned } = useNewlyAddedRowPin()

  const { notifySuccess } = useNotifications()
  const notificationsRef = useRef<HTMLDivElement>(null)
  // One call covers every failure path on this page — validation and API alike.
  useScrollToTopOnError(errors, notificationsRef)

  const setError = (key: string, message: string | null) =>
    setErrors((prev) => ({ ...prev, [key]: message }))

  useEffect(() => {
    let mounted = true
    Promise.all([loadMills(), getIspSellPriceZoneCodes()])
      .then(([millsData, zonesData]) => {
        if (!mounted) return
        setMills(millsData)
        setZones(
          zonesData
            .map((z) => ({ code: z.ispSellPriceZoneCode, description: z.description }))
            .sort((a, b) => (a.description || a.code).localeCompare(b.description || b.code)),
        )
      })
      .catch(() => {
        if (mounted)
          setError('load', 'The mills could not be loaded. Refresh the page to try again.')
      })
    return () => {
      mounted = false
    }
  }, [])

  const millNumberOptions = useMemo(
    () =>
      Array.from(new Map(mills.map((m) => [m.millNumber, m])).values())
        .sort((a, b) => a.millName.localeCompare(b.millName))
        .map((m) => ({ id: String(m.millNumber), name: String(m.millNumber) })),
    [mills],
  )

  const millNameOptions = useMemo(
    () =>
      Array.from(new Set(mills.map((m) => m.millName)))
        .sort((a, b) => a.localeCompare(b))
        .map((n) => ({ id: n, name: n })),
    [mills],
  )

  const zoneOptions = useMemo(
    () =>
      zones.map((z) => ({
        id: z.code,
        name: `${z.code}${z.description ? ' - ' + z.description : ''}`,
      })),
    [zones],
  )

  const applyFilters = (millsData: MillModel[]): MillModel[] => {
    let res = millsData.slice()
    if (selectedMillNumbers.length > 0) {
      res = res.filter((r) => selectedMillNumbers.includes(String(r.millNumber)))
    }
    if (selectedMillNames.length > 0)
      res = res.filter((r) => selectedMillNames.includes(r.millName))
    if (selectedZones.length > 0) {
      res = res.filter((r) => selectedZones.includes(r.ispSellPriceZoneCode || ''))
    }
    if (activeFilter === 'active' || activeFilter === 'inactive') {
      const today = toIsoLocalDate(new Date())
      const isActive = (r: MillModel) =>
        !!r.effectiveDate && r.effectiveDate <= today && (!r.expiryDate || r.expiryDate > today)
      res = res.filter((r) => (activeFilter === 'active' ? isActive(r) : !isActive(r)))
    }
    return res
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setFiltered(applyFilters(mills))
    setHasSearched(true)
    clearPinned()
  }

  const handleClearFilters = () => {
    setSelectedMillNumbers([])
    setSelectedMillNames([])
    setSelectedZones([])
    setActiveFilter('all')
    setFiltered([])
    setHasSearched(false)
    clearPinned()
  }

  const refreshMills = async (): Promise<MillModel[]> => {
    const reloaded = await loadMills()
    setMills(reloaded)
    if (hasSearched) setFiltered(applyFilters(reloaded))
    return reloaded
  }

  const handleEditChange = (editingId: string, field: keyof MillRow, value: string | number) => {
    if (editingRowIds.has(editingId)) {
      setEditedValues((prev) => ({
        ...prev,
        [editingId]: { ...prev[editingId], [field]: value },
      }))
    }
  }

  const handleSave = async (editingId: string, currentData: Partial<MillRow>) => {
    const originalMill = mills.find((m) => String(m.millId) === editingId)
    if (!originalMill) return

    const newMillName = currentData.millName?.trim() || ''
    if (newMillName && newMillName.toLowerCase() !== originalMill.millName.trim().toLowerCase()) {
      const otherMillNames = mills
        .filter((mill) => String(mill.millId) !== editingId)
        .map((mill) => mill.millName)
      const nameDuplicateError = validateNoDuplicate(newMillName, otherMillNames, 'mill name')
      if (nameDuplicateError) {
        setError(editingId, nameDuplicateError)
        throw new ValidationError(nameDuplicateError)
      }
    }

    const effectiveDate = currentData.effectiveDate ?? originalMill.effectiveDate
    const expiryDate = currentData.expiryDate ?? originalMill.expiryDate
    const dateError = validateDateRange(effectiveDate, expiryDate)
    if (dateError) {
      setError(editingId, dateError)
      throw new ValidationError(dateError)
    }

    setError(editingId, null)

    try {
      await saveMill({
        millNumber: originalMill.millNumber,
        millName: currentData.millName ?? originalMill.millName,
        ispSellPriceZoneCode: currentData.ispSellPriceZoneCode ?? originalMill.ispSellPriceZoneCode,
        clientNumber: currentData.clientNumber ?? originalMill.clientNumber,
        clientLocnCode: currentData.clientLocnCode ?? originalMill.clientLocnCode,
        comments: currentData.comments ?? originalMill.comments,
        effectiveDate,
        expiryDate,
      })
      await refreshMills()
      notifySuccess('Mill saved')
    } catch (err) {
      setError(editingId, err instanceof Error ? err.message : 'Failed to save mill.')
      throw err
    }
  }

  const handleAddSave = async () => {
    if (newRow.millNumber !== undefined) {
      const numberDuplicateError = validateNoDuplicate(
        String(newRow.millNumber),
        mills.map((mill) => String(mill.millNumber)),
        'mill number',
      )
      if (numberDuplicateError) {
        setError('newRow', numberDuplicateError)
        return
      }
    }

    if (newRow.millName) {
      const nameDuplicateError = validateNoDuplicate(
        newRow.millName,
        mills.map((mill) => mill.millName),
        'mill name',
      )
      if (nameDuplicateError) {
        setError('newRow', nameDuplicateError)
        return
      }
    }

    setError('newRow', null)

    const payload = {
      millNumber: Number(newRow.millNumber),
      millName: newRow.millName || '',
      ispSellPriceZoneCode: newRow.ispSellPriceZoneCode,
      clientNumber: newRow.clientNumber || '',
      clientLocnCode: newRow.clientLocnCode || '',
      effectiveDate: newRow.effectiveDate,
      expiryDate: '9999-12-31',
      comments: newRow.comments || '',
    }
    try {
      await saveMill(payload)
      const refreshed = await refreshMills()
      pinFromRows(
        refreshed.map((m) => ({ ...m, id: millRowId(m) })),
        (m) => m.millNumber === payload.millNumber,
      )
      setIsAddOpen(false)
      setNewRow({})
      notifySuccess('Mill added')
    } catch (err) {
      setError('newRow', err instanceof Error ? err.message : 'Failed to save mill.')
    }
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    exportMills(format)
      .then(() => notifySuccess(`Mill table exported to ${format.toUpperCase()}`))
      .catch(() =>
        setError('export', `Failed to export the mill table as ${format.toUpperCase()}.`),
      )
  }

  // Identifies which row an error banner belongs to, since multiple rows can be edited concurrently.
  const millRowLabel = (rowId: string): string => {
    const mill = mills.find((m) => String(m.millId) === rowId)
    return mill ? ` (Mill ${mill.millNumber})` : ''
  }

  /** Banner heading for each key the `errors` map can hold. */
  const millErrorTitle = (key: string): string => {
    if (key === 'load') return 'Unable to load mills'
    if (key === 'newRow') return 'Unable to add mill'
    if (key === 'export') return 'Unable to export'
    if (key.startsWith('delete-')) {
      return `Unable to delete mill${millRowLabel(key.slice('delete-'.length))}`
    }
    return `Unable to save changes${millRowLabel(key)}`
  }

  const rowsToDisplay = useMemo(
    () =>
      (hasSearched ? filtered : [])
        .slice()
        .sort((a, b) => a.millName.localeCompare(b.millName))
        .map((r) => ({ ...r, id: millRowId(r) })),
    [filtered, hasSearched],
  )

  const editState: EditState<MillRow> = {
    editingRowIds,
    editedValues,
    setEditingRowIds,
    setEditedValues,
  }

  const actionsConfig: ActionsConfig<MillRow> = {
    onSave: (row) => handleSave(String(row.millId), editedValues[String(row.millId)] || {}),
    onDelete: async (row) => {
      if (row.millId === undefined) return
      try {
        await deleteMill(row.millId)
        setFiltered((prev) => prev.filter((p) => p.millId !== row.millId))
        await refreshMills()
        notifySuccess('Mill deleted')
      } catch (err) {
        setError(
          `delete-${row.millId}`,
          err instanceof Error ? err.message : 'Failed to delete mill.',
        )
      }
    },
    showEdit: canWrite,
    showDelete: canWrite,
  }

  const renderCell = (row: TypedDataTableRow, cell: DataTableCell): ReactNode => {
    const rowId = row.id
    const headerKey = cell.info.header as keyof MillRow
    const currentEditingData = editedValues[rowId] || {}

    if (editingRowIds.has(rowId)) {
      const maxLength = TEXT_FIELD_MAX_LENGTH[headerKey]
      if (maxLength) {
        return (
          <TableCell key={cell.id}>
            <TextInput
              id={`edit-${headerKey}-${rowId}`}
              size="sm"
              labelText=""
              value={(currentEditingData[headerKey] as string) ?? (cell.value as string) ?? ''}
              onChange={(e) => handleEditChange(rowId, headerKey, e.target.value)}
              maxLength={maxLength}
            />
          </TableCell>
        )
      }
      if (headerKey === 'ispSellPriceZoneCode') {
        return (
          <TableCell key={cell.id}>
            <Dropdown
              id={`edit-zone-${rowId}`}
              titleText=""
              label="zone"
              items={zones}
              itemToString={(item) => (item ? item.code : '')}
              selectedItem={zones.find(
                (z) =>
                  z.code === (currentEditingData.ispSellPriceZoneCode ?? (cell.value as string)),
              )}
              onChange={({ selectedItem }) => {
                if (selectedItem?.code) {
                  handleEditChange(rowId, 'ispSellPriceZoneCode', selectedItem.code)
                }
              }}
              size="sm"
              autoAlign
              direction="bottom"
            />
          </TableCell>
        )
      }
    }
    const align = headers.find((h) => h.key === headerKey)?.align
    return (
      <TableCell key={cell.id} style={align ? { textAlign: align } : undefined}>
        {cell.value}
      </TableCell>
    )
  }

  const zonesWithPlaceholder = [NO_ZONE, ...zones]

  return (
    <section className="isp-page isp-page--wide">
      <Grid>
        <Column lg={16} md={8} sm={4}>
          <PageNotifications
            ref={notificationsRef}
            errors={errors}
            titleFor={millErrorTitle}
            onDismiss={(key) => setError(key, null)}
          />
        </Column>
        <Column lg={16} md={8} sm={4}>
          <h1>Mill Table</h1>
        </Column>

        <Column lg={16} md={8} sm={4}>
          <Form onSubmit={handleSearch}>
            <Grid>
              <Column md={4} lg={4}>
                <MultiSelectWithTags
                  id="mill-number-select"
                  titleText="Mill Number"
                  items={millNumberOptions}
                  selectedIds={selectedMillNumbers}
                  onChange={setSelectedMillNumbers}
                  dropdownLabel="Filter by mill number"
                  showClearButton={true}
                />
              </Column>
              <Column md={8} lg={8}>
                <MultiSelectWithTags
                  id="mill-name-select"
                  titleText="Mill Name"
                  items={millNameOptions}
                  selectedIds={selectedMillNames}
                  onChange={setSelectedMillNames}
                  dropdownLabel="Filter by mill name"
                  showClearButton={true}
                />
              </Column>
              <Column md={4} lg={4}>
                <MultiSelectWithTags
                  id="zone-select"
                  titleText="Zone"
                  items={zoneOptions}
                  selectedIds={selectedZones}
                  onChange={setSelectedZones}
                  dropdownLabel="Filter by zone"
                  showClearButton={true}
                />
              </Column>
            </Grid>
            <Grid>
              <Column md={4} lg={4} className="isp-mills__active-filter">
                <Dropdown
                  id="active-filter-select"
                  titleText={<strong>Active?</strong>}
                  label="Select..."
                  items={ACTIVE_OPTIONS}
                  itemToString={(item) => (item ? item.text : '')}
                  selectedItem={ACTIVE_OPTIONS.find((o) => o.id === activeFilter) ?? null}
                  onChange={({ selectedItem }) => setActiveFilter(selectedItem?.id ?? '')}
                />
              </Column>
            </Grid>
            <Grid>
              <Column md={8} lg={8} className="isp-mills__search-actions">
                <SearchButton />
                <ClearButton onClick={handleClearFilters} kind="ghost" label="Clear filters" />
              </Column>
            </Grid>
          </Form>
        </Column>

        <Column lg={16} md={8} sm={4} className="isp-mills__results">
          {canWrite && (
            <Button
              kind="secondary"
              size="md"
              renderIcon={isAddOpen ? Subtract : Add}
              onClick={() => setIsAddOpen(!isAddOpen)}
            >
              {isAddOpen ? 'Collapse' : 'Add New Row'}
            </Button>
          )}
          {canWrite && isAddOpen && (
            <div className="add-line-item-box">
              <div className="line-item-row">
                <div className="line-item-field line-item-field--num" title="Mill Number">
                  <TextInput
                    id="new-mill-number"
                    labelText={<RequiredLabel>Mill Number</RequiredLabel>}
                    value={newRow.millNumber ?? ''}
                    onChange={(e) => {
                      const digits = filterIntegerInput(e.target.value)
                      if (digits.length > 10) return
                      setNewRow((prev) => ({
                        ...prev,
                        millNumber: digits === '' ? undefined : Number(digits),
                      }))
                    }}
                    maxLength={10}
                    required
                  />
                </div>
                <div className="line-item-field" title="Mill Name">
                  <TextInput
                    id="new-mill-name"
                    labelText={<RequiredLabel>Mill Name</RequiredLabel>}
                    value={newRow.millName ?? ''}
                    onChange={(e) => setNewRow((prev) => ({ ...prev, millName: e.target.value }))}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="line-item-field" title="Zone">
                  <Dropdown
                    id="new-zone-select"
                    titleText={<RequiredLabel>Zone</RequiredLabel>}
                    label="Select..."
                    items={zonesWithPlaceholder}
                    itemToString={(item) => (item ? item.code || (item.description ?? '') : '')}
                    selectedItem={
                      zonesWithPlaceholder.find(
                        (z) => z.code === (newRow.ispSellPriceZoneCode ?? ''),
                      ) ?? null
                    }
                    onChange={({ selectedItem }) =>
                      setNewRow((prev) => ({
                        ...prev,
                        ispSellPriceZoneCode: selectedItem?.code || undefined,
                      }))
                    }
                  />
                </div>
                <div className="line-item-field line-item-field--num" title="Client Number">
                  <TextInput
                    id="new-client-number"
                    labelText={<RequiredLabel>Client No.</RequiredLabel>}
                    value={newRow.clientNumber ?? ''}
                    onChange={(e) =>
                      setNewRow((prev) => ({ ...prev, clientNumber: e.target.value }))
                    }
                    maxLength={8}
                  />
                </div>
                <div className="line-item-field line-item-field--num" title="Client Location">
                  <TextInput
                    id="new-client-loc"
                    labelText={<RequiredLabel>Client Loc.</RequiredLabel>}
                    value={newRow.clientLocnCode ?? ''}
                    onChange={(e) =>
                      setNewRow((prev) => ({ ...prev, clientLocnCode: e.target.value }))
                    }
                    maxLength={2}
                  />
                </div>
                <div className="line-item-field" title="Comments">
                  <TextInput
                    id="new-comments"
                    labelText={<RequiredLabel>Comments</RequiredLabel>}
                    value={newRow.comments ?? ''}
                    onChange={(e) => setNewRow((prev) => ({ ...prev, comments: e.target.value }))}
                    maxLength={4000}
                  />
                </div>
                <div className="line-item-field" title="Effective Date">
                  <DatePicker
                    key={`effective-date-${newRow.effectiveDate || 'empty'}`}
                    dateFormat="Y-m-d"
                    datePickerType="single"
                    value={newRow.effectiveDate}
                    onChange={(dates: Date[]) => {
                      if (dates[0]) {
                        setNewRow((prev) => ({ ...prev, effectiveDate: toIsoLocalDate(dates[0]) }))
                      }
                    }}
                  >
                    <DatePickerInput
                      id="new-effective"
                      labelText={<RequiredLabel>Effective Date</RequiredLabel>}
                      placeholder="YYYY-MM-DD"
                    />
                  </DatePicker>
                </div>
                <div className="line-item-field line-item-field--actions" title="Actions">
                  <span className="cds--label line-item-actions-label" aria-hidden="true">
                    &nbsp;
                  </span>
                  <div className="line-item-actions-buttons">
                    <Button
                      hasIconOnly
                      renderIcon={Checkmark}
                      iconDescription="Save New Row"
                      kind="primary"
                      size="md"
                      onClick={() => void handleAddSave()}
                      disabled={
                        !newRow.millNumber ||
                        !newRow.millName ||
                        !newRow.clientNumber ||
                        !newRow.clientLocnCode ||
                        !newRow.comments ||
                        !newRow.effectiveDate
                      }
                    />
                    <Button
                      hasIconOnly
                      renderIcon={Close}
                      iconDescription="Clear"
                      kind="ghost"
                      size="md"
                      onClick={() => {
                        setNewRow({})
                        setError('newRow', null)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {hasSearched && filtered.length > 0 && (
            <div className="isp-mills__export">
              <ExportButtons onExport={handleExport} size="md" />
            </div>
          )}

          <div className="isp-mills__table">
            <ReusableDataTable
              headers={headers}
              rows={rowsToDisplay}
              isSortable
              editState={editState}
              actionsConfig={actionsConfig}
              renderCell={renderCell}
              pinnedRowId={justAddedId}
              onSortChange={() => clearPinned()}
              tableState={
                !hasSearched ? 'initial' : rowsToDisplay.length === 0 ? 'no-results' : undefined
              }
            />
          </div>
        </Column>
      </Grid>
    </section>
  )
}

export default MillsPage
