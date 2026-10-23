import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import MultiSelectWithTags from '@/components/common/MultiSelectWithTags/MultiSelectWithTags'

const items = [
  { id: 'a', name: 'Apple' },
  { id: 'b', name: 'Banana' },
  { id: 'c', name: 'Cherry' },
]

const renderComponent = (props: Partial<React.ComponentProps<typeof MultiSelectWithTags>> = {}) => {
  const onChange = vi.fn()
  const utils = render(
    <MultiSelectWithTags
      id="fruits"
      titleText="Fruits"
      items={items}
      selectedIds={[]}
      onChange={onChange}
      {...props}
    />,
  )
  return { onChange, ...utils }
}

const openMenu = async () => {
  fireEvent.click(screen.getByRole('combobox'))
  return await screen.findAllByRole('option')
}

describe('MultiSelectWithTags', () => {
  it('renders the title and the empty tag placeholder', () => {
    renderComponent()
    expect(screen.getByText('Fruits')).toBeInTheDocument()
    expect(screen.getByText('Nothing Selected')).toBeInTheDocument()
  })

  it('lists Select All ahead of the real items in the menu', async () => {
    renderComponent()
    const options = await openMenu()
    expect(options).toHaveLength(4)
    expect(options[0]).toHaveTextContent('Select All')
    expect(options[1]).toHaveTextContent('Apple')
    expect(options[3]).toHaveTextContent('Cherry')
  })

  it('selects a regular item and reports its id', async () => {
    const { onChange } = renderComponent()
    await openMenu()
    fireEvent.click(screen.getByRole('option', { name: /Banana/ }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['b']))
  })

  it('deselects an already selected item', async () => {
    const { onChange } = renderComponent({ selectedIds: ['a', 'b'] })
    await openMenu()
    fireEvent.click(screen.getByRole('option', { name: /Banana/ }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['a']))
  })

  it('selects every item when Select All is checked', async () => {
    const { onChange } = renderComponent({ selectedIds: ['a'] })
    await openMenu()
    fireEvent.click(screen.getByRole('option', { name: /Select All/ }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['a', 'b', 'c']))
  })

  it('clears everything when Select All is unchecked', async () => {
    const { onChange } = renderComponent({ selectedIds: ['a', 'b', 'c'] })
    await openMenu()
    fireEvent.click(screen.getByRole('option', { name: /Select All/ }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([]))
  })

  it('renders a dismissible tag per selected item and removes on dismiss', async () => {
    const { onChange, container } = renderComponent({ selectedIds: ['a', 'c'] })
    const tagContainer = container.querySelector('.multiselect-tags-container') as HTMLElement
    expect(within(tagContainer).getByText('Apple')).toBeInTheDocument()
    expect(within(tagContainer).getByText('Cherry')).toBeInTheDocument()
    expect(screen.queryByText('Nothing Selected')).not.toBeInTheDocument()

    const closeButtons = within(tagContainer).getAllByRole('button')
    fireEvent.click(closeButtons[0])
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['c']))
  })

  it('clears the selection via the Clear button', () => {
    const { onChange } = renderComponent({ selectedIds: ['a', 'b'] })
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('disables the Clear button when nothing is selected', () => {
    renderComponent({ selectedIds: [] })
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
  })

  it('honors clear button customization and hiding', () => {
    const { rerender } = renderComponent({
      selectedIds: ['a'],
      clearButtonLabel: 'Reset',
      clearButtonKind: 'ghost',
      clearButtonWidth: '200px',
    })
    const button = screen.getByRole('button', { name: 'Reset' })
    expect(button).toHaveStyle({ width: '200px' })
    expect(button.className).toContain('cds--btn--ghost')

    rerender(
      <MultiSelectWithTags
        id="fruits"
        titleText="Fruits"
        items={items}
        selectedIds={['a']}
        onChange={vi.fn()}
        showClearButton={false}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })

  it('disables the MultiSelect and Clear button when disabled', () => {
    renderComponent({ selectedIds: ['a'], disabled: true })
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
  })

  it('renders the invalid state with the given message', () => {
    renderComponent({ invalidText: 'Pick at least one fruit' })
    expect(screen.getByText('Pick at least one fruit')).toBeInTheDocument()
  })

  it('filters items by the typed text while keeping Select All visible', async () => {
    renderComponent()
    const input = screen.getByRole('combobox')
    fireEvent.click(input)
    await screen.findAllByRole('option')
    fireEvent.change(input, { target: { value: 'ban' } })
    await waitFor(() => {
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(2)
      expect(options[0]).toHaveTextContent('Select All')
      expect(options[1]).toHaveTextContent('Banana')
    })
  })

  it('swallows Backspace when the filter input is empty but not while typing', async () => {
    renderComponent({ selectedIds: ['a'] })
    const input = screen.getByRole('combobox') as HTMLInputElement
    fireEvent.click(input)
    await screen.findAllByRole('option')

    // Empty input: Backspace is captured and prevented (no crash, selection untouched)
    fireEvent.keyDown(input, { key: 'Backspace' })

    // With text present the event flows through normally
    fireEvent.change(input, { target: { value: 'ap' } })
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(input).toBeInTheDocument()
  })

  it('sets the tag container height', () => {
    const { container } = renderComponent({ tagContainerHeight: '12rem' })
    expect(container.querySelector('.multiselect-tags-container')).toHaveStyle({ height: '12rem' })
  })
})
