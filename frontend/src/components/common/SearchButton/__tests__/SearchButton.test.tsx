import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import SearchButton from '@/components/common/SearchButton/SearchButton'

describe('SearchButton', () => {
  it('renders a submit button with the default label', () => {
    render(<SearchButton />)
    const button = screen.getByRole('button', { name: /Search/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toBeEnabled()
  })

  it('renders a custom label', () => {
    render(<SearchButton searchLabel="Find records" />)
    expect(screen.getByRole('button', { name: /Find records/i })).toBeInTheDocument()
  })

  it('is disabled while loading', () => {
    render(<SearchButton isLoading />)
    expect(screen.getByRole('button', { name: /Search/i })).toBeDisabled()
  })

  it('applies a custom style', () => {
    render(<SearchButton style={{ marginTop: '2rem' }} />)
    expect(screen.getByRole('button', { name: /Search/i })).toHaveStyle({ marginTop: '2rem' })
  })
})
