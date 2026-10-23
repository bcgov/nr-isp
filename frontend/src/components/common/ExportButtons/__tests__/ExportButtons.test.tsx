import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ExportButtons from '@/components/common/ExportButtons/ExportButtons'

describe('ExportButtons', () => {
  it('renders both export buttons', () => {
    render(<ExportButtons onExport={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Export to PDF' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export to CSV' })).toBeInTheDocument()
  })

  it('calls onExport with "pdf" when the PDF button is clicked', () => {
    const onExport = vi.fn()
    render(<ExportButtons onExport={onExport} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export to PDF' }))
    expect(onExport).toHaveBeenCalledTimes(1)
    expect(onExport).toHaveBeenCalledWith('pdf')
  })

  it('calls onExport with "csv" when the CSV button is clicked', () => {
    const onExport = vi.fn()
    render(<ExportButtons onExport={onExport} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export to CSV' }))
    expect(onExport).toHaveBeenCalledTimes(1)
    expect(onExport).toHaveBeenCalledWith('csv')
  })

  it('supports an async onExport handler', () => {
    const onExport = vi.fn().mockResolvedValue(undefined)
    render(<ExportButtons onExport={onExport} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export to PDF' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export to CSV' }))
    expect(onExport).toHaveBeenNthCalledWith(1, 'pdf')
    expect(onExport).toHaveBeenNthCalledWith(2, 'csv')
  })

  it('applies size and style to the wrapper', () => {
    const { container } = render(
      <ExportButtons onExport={vi.fn()} size="lg" style={{ marginLeft: '1rem' }} />,
    )
    expect(container.firstChild).toHaveStyle({ marginLeft: '1rem' })
    expect(screen.getByRole('button', { name: 'Export to PDF' }).className).toContain(
      'cds--btn--lg',
    )
  })
})
