import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Dropdown from '@/components/common/Dropdown/Dropdown'

interface Item {
  id: string
  label: string
}

const items: Item[] = [
  { id: '1', label: 'Alpha' },
  { id: '2', label: 'Beta' },
  { id: '3', label: 'Gamma' },
]

const itemToString = (item: Item | null): string => (item ? item.label : '')

const renderDropdown = (props: Partial<React.ComponentProps<typeof Dropdown<Item>>> = {}) => {
  const onChange = vi.fn()
  const utils = render(
    <Dropdown<Item>
      id="test-dd"
      titleText="Pick one"
      items={items}
      itemToString={itemToString}
      onChange={onChange}
      {...props}
    />,
  )
  return { onChange, ...utils }
}

describe('Dropdown', () => {
  it('renders title text and the default placeholder label', () => {
    renderDropdown()
    expect(screen.getByText('Pick one')).toBeInTheDocument()
    expect(screen.getByText('Select...')).toBeInTheDocument()
  })

  it('renders a custom label', () => {
    renderDropdown({ label: 'Choose a thing' })
    expect(screen.getByText('Choose a thing')).toBeInTheDocument()
  })

  it('opens the menu and lists all items', async () => {
    renderDropdown()
    fireEvent.click(screen.getByRole('combobox'))
    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('Alpha')
    expect(options[2]).toHaveTextContent('Gamma')
  })

  it('calls onChange with the selected item', async () => {
    const { onChange } = renderDropdown()
    fireEvent.click(screen.getByRole('combobox'))
    const option = await screen.findByRole('option', { name: 'Beta' })
    fireEvent.click(option)
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
    expect(onChange.mock.calls[0][0].selectedItem).toEqual({ id: '2', label: 'Beta' })
  })

  it('shows the selected item text', () => {
    renderDropdown({ selectedItem: items[2] })
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })

  it('renders invalid state from invalidText', () => {
    renderDropdown({ invalidText: 'Required field' })
    expect(screen.getByText('Required field')).toBeInTheDocument()
    expect(document.querySelector('[data-invalid="true"]')).toBeInTheDocument()
  })

  it('explicit invalid prop overrides invalidText presence', () => {
    renderDropdown({ invalid: false, invalidText: 'Ignored' })
    expect(document.querySelector('[data-invalid="true"]')).not.toBeInTheDocument()
  })

  it('renders warning text when warn is set', () => {
    renderDropdown({ warn: true, warnText: 'Careful now' })
    expect(screen.getByText('Careful now')).toBeInTheDocument()
  })

  it('disables the trigger when disabled', () => {
    renderDropdown({ disabled: true })
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('adds the expand-on-focus marker class when requested', () => {
    const { container } = renderDropdown({ expandOnFocus: true })
    expect(container.querySelector('.dropdown--expand-on-focus')).toBeInTheDocument()
  })

  it('omits the marker class by default', () => {
    const { container } = renderDropdown()
    expect(container.querySelector('.dropdown--expand-on-focus')).not.toBeInTheDocument()
  })

  it('skips the manual menu correction when autoAlign is on', async () => {
    renderDropdown({ autoAlign: true })
    fireEvent.click(screen.getByRole('combobox'))
    await screen.findAllByRole('option')
    const menu = document.querySelector('.cds--list-box__menu') as HTMLElement
    fireEvent(window, new Event('resize'))
    // No manual translateX correction is applied in autoAlign mode
    expect(menu.style.transform).not.toContain('translateX')
  })

  it('shifts an overflowing open menu back into the viewport', async () => {
    const originalGetRect = Element.prototype.getBoundingClientRect
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      const rect = originalGetRect.call(this)
      if ((this as HTMLElement).classList?.contains('cds--list-box__menu')) {
        return { ...rect, right: window.innerWidth + 76, toJSON: () => ({}) } as DOMRect
      }
      return rect
    })
    try {
      renderDropdown()
      fireEvent.click(screen.getByRole('combobox'))
      await screen.findAllByRole('option')
      fireEvent(window, new Event('resize'))
      await waitFor(() => {
        const menu = document.querySelector('.cds--list-box__menu') as HTMLElement
        expect(menu.style.transform).toBe('translateX(-100px)')
      })
    } finally {
      spy.mockRestore()
    }
  })

  it('leaves the menu untouched when it fits in the viewport', async () => {
    renderDropdown()
    fireEvent.click(screen.getByRole('combobox'))
    await screen.findAllByRole('option')
    fireEvent(window, new Event('resize'))
    const menu = document.querySelector('.cds--list-box__menu') as HTMLElement
    expect(menu.style.transform).toBe('')
  })
})
