import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ClearButton from '@/components/common/ClearButton/ClearButton'

describe('ClearButton', () => {
  it('renders with the default label and fires onClick', () => {
    const onClick = vi.fn()
    render(<ClearButton onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'Clear' })
    expect(button).toHaveAttribute('type', 'button')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a custom label', () => {
    render(<ClearButton onClick={vi.fn()} label="Reset filters" />)
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument()
  })

  it('is disabled while loading and does not fire onClick', () => {
    const onClick = vi.fn()
    render(<ClearButton onClick={onClick} isLoading />)
    const button = screen.getByRole('button', { name: 'Clear' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('prevents default form submission behavior on click', () => {
    const onClick = vi.fn()
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <ClearButton onClick={onClick} />
      </form>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('applies style and kind props', () => {
    render(<ClearButton onClick={vi.fn()} kind="danger" style={{ width: '120px' }} />)
    const button = screen.getByRole('button', { name: /Clear/ })
    expect(button).toHaveStyle({ width: '120px' })
    expect(button.className).toContain('cds--btn--danger')
  })
})
