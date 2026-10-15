import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { approver, authValue, renderWithProviders } from '@/__tests__/test-utils'
import type { MillModel } from '@/interfaces/Mill'
import MillsPage from '@/pages/Mills'
import {
  deleteMill,
  exportMills,
  getIspSellPriceZoneCodes,
  getMills,
  saveMill,
} from '@/service/mills-service'

vi.mock('@/service/mills-service', () => ({
  getMills: vi.fn(),
  getIspSellPriceZoneCodes: vi.fn(),
  saveMill: vi.fn(),
  deleteMill: vi.fn(),
  exportMills: vi.fn(),
}))

const notifySuccess = vi.fn()
vi.mock('@/context/notification/useNotifications', () => ({
  useNotifications: () => ({
    toasts: [],
    notifySuccess,
    notifyError: vi.fn(),
    notifyWarning: vi.fn(),
    notifyInfo: vi.fn(),
    dismissToast: vi.fn(),
  }),
}))

// Simplified stand-ins for the shared select widgets so tests can interact through plain buttons
// instead of driving Carbon's floating menus.
vi.mock('@/components/common/Dropdown/Dropdown', () => ({
  default: ({
    id,
    items,
    itemToString,
    onChange,
  }: {
    id: string
    items: unknown[]
    itemToString: (item: unknown) => string
    onChange: (e: { selectedItem: unknown }) => void
  }) => (
    <div data-testid={id}>
      {items.map((item) => (
        <button
          key={itemToString(item)}
          type="button"
          onClick={() => onChange({ selectedItem: item })}
        >
          {itemToString(item)}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/common/MultiSelectWithTags/MultiSelectWithTags', () => ({
  default: ({
    id,
    items,
    selectedIds,
    onChange,
  }: {
    id: string
    items: { id: string; name: string }[]
    selectedIds: string[]
    onChange: (ids: string[]) => void
  }) => (
    <div data-testid={id}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() =>
            onChange(
              selectedIds.includes(item.id)
                ? selectedIds.filter((x) => x !== item.id)
                : [...selectedIds, item.id],
            )
          }
        >
          {item.name}
        </button>
      ))}
    </div>
  ),
}))

// Replace Carbon's flatpickr-based DatePicker with a plain input so dates can be typed.
vi.mock('@carbon/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  DatePicker: ({
    value,
    onChange,
    children,
  }: {
    value?: unknown
    onChange?: (dates: Date[]) => void
    children?: ReactNode
  }) => (
    <div>
      <input
        data-testid="mock-datepicker"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange?.([new Date(`${e.target.value}T12:00:00`)])}
      />
      {children}
    </div>
  ),
  DatePickerInput: () => <span />,
}))

const millA: MillModel = {
  millId: 1,
  millNumber: 100,
  millName: 'Alpha Mill',
  ispSellPriceZoneCode: 'Z1',
  clientNumber: 'C100',
  clientLocnCode: '01',
  comments: 'first',
  effectiveDate: '2020-01-01',
  expiryDate: '9999-12-31',
  updateTimestamp: '2024-01-05T10:20:30-08:00',
  updateUserid: 'USERA',
  revisionCount: 1,
}

const millB: MillModel = {
  millId: 2,
  millNumber: 200,
  millName: 'Beta Mill',
  ispSellPriceZoneCode: 'Z2',
  clientNumber: 'C200',
  clientLocnCode: '02',
  comments: null,
  effectiveDate: '2030-01-01',
  expiryDate: '9999-12-31',
  updateTimestamp: '2023-11-14T22:13:20-08:00',
  updateUserid: 'USERB',
  revisionCount: 1,
}

const zones = [
  {
    ispSellPriceZoneCode: 'Z2',
    description: 'Zone Two',
    effectiveDate: '',
    expiryDate: '',
    updateTimestamp: '',
  },
  {
    ispSellPriceZoneCode: 'Z1',
    description: 'Zone One',
    effectiveDate: '',
    expiryDate: '',
    updateTimestamp: '',
  },
]

const admin = authValue({
  status: 'signed-in',
  user: { ...approver, roles: ['ISP_ADMIN'] },
  hasAnyRole: true,
  isAdmin: true,
})

const renderPage = async (auth = admin) => {
  renderWithProviders(<MillsPage />, { auth, path: '/mills' })
  await waitFor(() => expect(getMills).toHaveBeenCalled())
  // wait until the mill options built from the loaded data appear
  await within(screen.getByTestId('mill-number-select')).findByText('100')
}

const table = () => screen.getByRole('table')

const searchAll = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Search' }))
  await within(table()).findByText('Alpha Mill')
}

const rowFor = (text: string): HTMLElement => {
  const row = within(table()).getByText(text).closest('tr')
  if (!row) throw new Error(`row for ${text} not found`)
  return row
}

const input = (id: string) => document.getElementById(id) as HTMLInputElement

const openAddRow = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Add New Row' }))
  await screen.findByLabelText(/Mill Number/)
}

const fillAddRow = (overrides: Partial<Record<string, string>> = {}) => {
  const values = {
    millNumber: '300',
    millName: 'Gamma Mill',
    clientNumber: 'C300',
    clientLocnCode: '03',
    comments: 'new mill',
    effectiveDate: '2024-05-01',
    ...overrides,
  }
  fireEvent.change(input('new-mill-number'), { target: { value: values.millNumber } })
  fireEvent.change(input('new-mill-name'), { target: { value: values.millName } })
  fireEvent.change(input('new-client-number'), { target: { value: values.clientNumber } })
  fireEvent.change(input('new-client-loc'), { target: { value: values.clientLocnCode } })
  fireEvent.change(input('new-comments'), { target: { value: values.comments } })
  fireEvent.click(within(screen.getByTestId('new-zone-select')).getByText('Z1'))
  const box = document.querySelector('.add-line-item-box') as HTMLElement
  fireEvent.change(within(box).getByTestId('mock-datepicker'), {
    target: { value: values.effectiveDate },
  })
}

const editMill = async (millName: string, millId: number) => {
  fireEvent.click(within(rowFor(millName)).getByRole('button', { name: 'Edit' }))
  await waitFor(() => expect(input(`edit-millName-${millId}`)).toBeInTheDocument())
  return input(`edit-millName-${millId}`).closest('tr') as HTMLElement
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getMills).mockResolvedValue([millA, millB])
  vi.mocked(getIspSellPriceZoneCodes).mockResolvedValue(zones)
  vi.mocked(saveMill).mockResolvedValue(millA)
  vi.mocked(deleteMill).mockResolvedValue(undefined)
  vi.mocked(exportMills).mockResolvedValue(undefined)
})

describe('MillsPage', () => {
  it('loads mills and zones and waits for a search', async () => {
    await renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Mill Table' })).toBeInTheDocument()
    expect(getIspSellPriceZoneCodes).toHaveBeenCalled()
    expect(screen.getByText('No search performed')).toBeInTheDocument()
    expect(within(table()).queryByText('Alpha Mill')).not.toBeInTheDocument()
    // zones are offered by description
    const zoneButtons = within(screen.getByTestId('zone-select')).getAllByRole('button')
    expect(zoneButtons.map((button) => button.textContent)).toEqual([
      'Z1 - Zone One',
      'Z2 - Zone Two',
    ])
  })

  it('reports a failed load', async () => {
    vi.mocked(getMills).mockRejectedValue(new Error('nope'))
    renderWithProviders(<MillsPage />, { auth: admin })

    expect(await screen.findByText('Unable to load mills')).toBeInTheDocument()
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument()
    expect(screen.getByText('No search performed')).toBeInTheDocument()
  })

  it('shows every mill by name after searching without filters', async () => {
    await renderPage()
    await searchAll()

    const names = within(table())
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.querySelectorAll('td')[1]?.textContent)
    expect(names).toEqual(['Alpha Mill', 'Beta Mill'])
    // dates are shown in the medium format, the update timestamp by its date
    expect(within(table()).getByText('Jan 1, 2020')).toBeInTheDocument()
    expect(within(table()).getByText('Nov 14, 2023')).toBeInTheDocument()
  })

  it('filters by mill number, name and zone', async () => {
    await renderPage()
    fireEvent.click(within(screen.getByTestId('mill-number-select')).getByText('100'))
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await within(table()).findByText('Alpha Mill')
    expect(within(table()).queryByText('Beta Mill')).not.toBeInTheDocument()

    // name and zone filters that only match Beta leave nothing
    fireEvent.click(within(screen.getByTestId('mill-name-select')).getByText('Beta Mill'))
    fireEvent.click(within(screen.getByTestId('zone-select')).getByText('Z2 - Zone Two'))
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByText('No results found')).toBeInTheDocument()
  })

  it('filters by active and inactive status', async () => {
    await renderPage()
    fireEvent.click(within(screen.getByTestId('active-filter-select')).getByText('Active'))
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await within(table()).findByText('Alpha Mill')
    expect(within(table()).queryByText('Beta Mill')).not.toBeInTheDocument()

    fireEvent.click(within(screen.getByTestId('active-filter-select')).getByText('Inactive'))
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await within(table()).findByText('Beta Mill')
    expect(within(table()).queryByText('Alpha Mill')).not.toBeInTheDocument()
  })

  it('clears the filters and the results', async () => {
    await renderPage()
    await searchAll()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(await screen.findByText('No search performed')).toBeInTheDocument()
    expect(within(table()).queryByText('Alpha Mill')).not.toBeInTheDocument()
  })

  it('adds a mill with an open expiry date', async () => {
    await renderPage()
    await openAddRow()
    const saveButton = screen.getByRole('button', { name: 'Save New Row' })
    expect(saveButton).toBeDisabled()

    fillAddRow()
    expect(saveButton).toBeEnabled()
    fireEvent.click(saveButton)

    await waitFor(() =>
      expect(saveMill).toHaveBeenCalledWith({
        millNumber: 300,
        millName: 'Gamma Mill',
        ispSellPriceZoneCode: 'Z1',
        clientNumber: 'C300',
        clientLocnCode: '03',
        effectiveDate: '2024-05-01',
        expiryDate: '9999-12-31',
        comments: 'new mill',
      }),
    )
    expect(notifySuccess).toHaveBeenCalledWith('Mill added')
    await waitFor(() => expect(screen.queryByLabelText(/Mill Number/)).not.toBeInTheDocument())
  })

  it('accepts only digits in the new mill number', async () => {
    await renderPage()
    await openAddRow()

    fireEvent.change(input('new-mill-number'), { target: { value: '12a3' } })
    expect(input('new-mill-number').value).toBe('123')
    fireEvent.change(input('new-mill-number'), { target: { value: '12345678901' } })
    expect(input('new-mill-number').value).toBe('123')
    fireEvent.change(input('new-mill-number'), { target: { value: '' } })
    expect(input('new-mill-number').value).toBe('')
  })

  it('shows and pins an added mill while a search is active', async () => {
    await renderPage()
    await searchAll()
    vi.mocked(getMills).mockResolvedValue([
      millA,
      millB,
      { ...millA, millId: 3, millNumber: 300, millName: 'Gamma Mill' },
    ])

    await openAddRow()
    fillAddRow()
    fireEvent.click(screen.getByRole('button', { name: 'Save New Row' }))

    await within(table()).findByText('Gamma Mill')
    expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('Gamma Mill')
    // sorting afterwards unpins the new row
    fireEvent.click(within(table()).getByRole('button', { name: /Mill Name/ }))
    await waitFor(() =>
      expect(within(table()).getAllByRole('row')[1]).toHaveTextContent('Alpha Mill'),
    )
  })

  it('refuses a duplicate mill number', async () => {
    await renderPage()
    await openAddRow()
    fillAddRow({ millNumber: '100' })
    fireEvent.click(screen.getByRole('button', { name: 'Save New Row' }))

    expect(
      await screen.findByText('A record with this mill number already exists.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Unable to add mill')).toBeInTheDocument()
    expect(saveMill).not.toHaveBeenCalled()
  })

  it('refuses a duplicate mill name, and Clear empties the new row', async () => {
    await renderPage()
    await openAddRow()
    fillAddRow({ millName: 'beta mill' })
    fireEvent.click(screen.getByRole('button', { name: 'Save New Row' }))

    expect(
      await screen.findByText('A record with this mill name already exists.'),
    ).toBeInTheDocument()
    expect(saveMill).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    await waitFor(() =>
      expect(
        screen.queryByText('A record with this mill name already exists.'),
      ).not.toBeInTheDocument(),
    )
    expect(input('new-mill-name').value).toBe('')
  })

  it('shows the API reason when adding fails', async () => {
    vi.mocked(saveMill).mockRejectedValue(new Error('Invalid Client Location Code: 03'))
    await renderPage()
    await openAddRow()
    fillAddRow()
    fireEvent.click(screen.getByRole('button', { name: 'Save New Row' }))

    expect(await screen.findByText('Invalid Client Location Code: 03')).toBeInTheDocument()
    expect(screen.getByText('Unable to add mill')).toBeInTheDocument()
  })

  it('edits a mill and saves the changes', async () => {
    await renderPage()
    await searchAll()
    const row = await editMill('Alpha Mill', 1)

    fireEvent.change(input('edit-millName-1'), { target: { value: 'Zed Mill' } })
    fireEvent.change(input('edit-comments-1'), { target: { value: 'updated comment' } })
    fireEvent.click(within(screen.getByTestId('edit-zone-1')).getByText('Z2'))
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(saveMill).toHaveBeenCalledWith({
        millNumber: 100,
        millName: 'Zed Mill',
        ispSellPriceZoneCode: 'Z2',
        clientNumber: 'C100',
        clientLocnCode: '01',
        comments: 'updated comment',
        effectiveDate: '2020-01-01',
        expiryDate: '9999-12-31',
      }),
    )
    expect(notifySuccess).toHaveBeenCalledWith('Mill saved')
    await waitFor(() => expect(input('edit-millName-1')).toBeNull())
  })

  it('edits a mill without comments', async () => {
    await renderPage()
    await searchAll()
    await editMill('Beta Mill', 2)

    expect(input('edit-comments-2').value).toBe('')
    expect(input('edit-millName-2')).toHaveAttribute('maxlength', '100')
    expect(input('edit-clientLocnCode-2')).toHaveAttribute('maxlength', '2')
  })

  it('refuses to rename a mill to an existing name', async () => {
    await renderPage()
    await searchAll()
    const row = await editMill('Alpha Mill', 1)

    fireEvent.change(input('edit-millName-1'), { target: { value: 'Beta Mill' } })
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('A record with this mill name already exists.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Unable to save changes (Mill 100)')).toBeInTheDocument()
    expect(saveMill).not.toHaveBeenCalled()
    // the row stays in edit mode with what was typed
    expect(input('edit-millName-1').value).toBe('Beta Mill')
  })

  it('refuses an effective date after the expiry date', async () => {
    await renderPage()
    await searchAll()
    const row = await editMill('Alpha Mill', 1)

    const [effective, expiry] = within(row).getAllByTestId('mock-datepicker')
    fireEvent.change(effective, { target: { value: '2030-05-01' } })
    fireEvent.change(expiry, { target: { value: '2020-01-01' } })
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('Effective date cannot be after expiry date.'),
    ).toBeInTheDocument()
    expect(saveMill).not.toHaveBeenCalled()
  })

  it('shows the API reason when saving an edit fails, and the banner can be dismissed', async () => {
    vi.mocked(saveMill).mockRejectedValue(new Error('Failed to save mill. (HTTP 500)'))
    await renderPage()
    await searchAll()
    const row = await editMill('Alpha Mill', 1)

    fireEvent.change(input('edit-millName-1'), { target: { value: 'Renamed Mill' } })
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Failed to save mill. (HTTP 500)')).toBeInTheDocument()
    const banner = screen
      .getByText('Unable to save changes (Mill 100)')
      .closest('.cds--inline-notification') as HTMLElement
    fireEvent.click(within(banner).getByRole('button', { name: /close/i }))
    await waitFor(() =>
      expect(screen.queryByText('Unable to save changes (Mill 100)')).not.toBeInTheDocument(),
    )
  })

  it('deletes a mill after confirmation', async () => {
    await renderPage()
    await searchAll()
    vi.mocked(getMills).mockResolvedValue([millB])

    fireEvent.click(within(rowFor('Alpha Mill')).getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))

    await waitFor(() => expect(deleteMill).toHaveBeenCalledWith(1))
    expect(notifySuccess).toHaveBeenCalledWith('Mill deleted')
    await waitFor(() => expect(within(table()).queryByText('Alpha Mill')).not.toBeInTheDocument())
  })

  it('shows why a delete failed', async () => {
    vi.mocked(deleteMill).mockRejectedValue(new Error('ORA-02292: child record found'))
    await renderPage()
    await searchAll()

    fireEvent.click(within(rowFor('Alpha Mill')).getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))

    expect(await screen.findByText('ORA-02292: child record found')).toBeInTheDocument()
    expect(screen.getByText('Unable to delete mill (Mill 100)')).toBeInTheDocument()
  })

  it('exports the table', async () => {
    await renderPage()
    await searchAll()

    fireEvent.click(screen.getByRole('button', { name: 'Export to CSV' }))
    await waitFor(() => expect(exportMills).toHaveBeenCalledWith('csv'))
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Mill table exported to CSV'))

    fireEvent.click(screen.getByRole('button', { name: 'Export to PDF' }))
    await waitFor(() => expect(exportMills).toHaveBeenCalledWith('pdf'))
  })

  it('reports a failed export', async () => {
    vi.mocked(exportMills).mockRejectedValue(new Error('boom'))
    await renderPage()
    await searchAll()

    fireEvent.click(screen.getByRole('button', { name: 'Export to PDF' }))

    expect(await screen.findByText('Failed to export the mill table as PDF.')).toBeInTheDocument()
    expect(screen.getByText('Unable to export')).toBeInTheDocument()
  })

  it('offers no changes to approvers', async () => {
    await renderPage(
      authValue({ status: 'signed-in', user: approver, hasAnyRole: true, isAdmin: false }),
    )

    expect(screen.queryByRole('button', { name: 'Add New Row' })).not.toBeInTheDocument()
    await searchAll()
    expect(
      within(rowFor('Alpha Mill')).queryByRole('button', { name: 'Edit' }),
    ).not.toBeInTheDocument()
    expect(
      within(rowFor('Alpha Mill')).queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument()
  })
})
