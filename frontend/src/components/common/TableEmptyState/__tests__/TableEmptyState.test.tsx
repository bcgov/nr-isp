import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TableEmptyState from '@/components/common/TableEmptyState/TableEmptyState'

describe('TableEmptyState', () => {
  it('renders the initial state prompt', () => {
    render(<TableEmptyState tableState="initial" />)
    expect(screen.getByText('No search performed')).toBeInTheDocument()
    expect(
      screen.getByText('Use the filters above and click Search to see results.'),
    ).toBeInTheDocument()
  })

  it('renders the no-results state', () => {
    render(<TableEmptyState tableState="no-results" />)
    expect(screen.getByText('No results found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search criteria.')).toBeInTheDocument()
  })

  it('renders the error state', () => {
    render(<TableEmptyState tableState="error" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
