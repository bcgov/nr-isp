import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { PageNotification } from '@/components/common/PageNotifications/PageNotifications'
import PageNotifications from '@/components/common/PageNotifications/PageNotifications'

describe('PageNotifications', () => {
  it('renders an empty but stable container when there is nothing to show', () => {
    const ref: { current: HTMLDivElement | null } = { current: null }
    const { container } = render(<PageNotifications ref={ref} />)
    const region = container.querySelector('.isp-page-notifications')
    expect(region).toBeInTheDocument()
    expect(region).toHaveAttribute('tabindex', '-1')
    expect(ref.current).toBe(region)
    expect(container.querySelectorAll('.cds--inline-notification')).toHaveLength(0)
  })

  it('renders one error notification per truthy entry in the errors map', () => {
    render(
      <PageNotifications
        errors={{
          row1: 'First failure',
          row2: null,
          row3: undefined,
          row4: 'Second failure',
          row5: '',
        }}
      />,
    )
    expect(screen.getByText('First failure')).toBeInTheDocument()
    expect(screen.getByText('Second failure')).toBeInTheDocument()
    // Default title is 'Error' for every keyed message
    expect(screen.getAllByText('Error')).toHaveLength(2)
    // Falsy messages are filtered out
    expect(document.querySelectorAll('.cds--inline-notification')).toHaveLength(2)
  })

  it('uses titleFor to compute the banner heading', () => {
    render(
      <PageNotifications
        errors={{ save: 'Could not save' }}
        titleFor={(key) => `Problem with ${key}`}
      />,
    )
    expect(screen.getByText('Problem with save')).toBeInTheDocument()
    expect(screen.getByText('Could not save')).toBeInTheDocument()
  })

  it('prefers explicit notifications over the errors map', () => {
    const notifications: PageNotification[] = [
      { id: 'a', kind: 'success', title: 'Saved', subtitle: 'Record saved successfully' },
      { id: 'b', subtitle: 'Defaults to error kind and title' },
    ]
    render(<PageNotifications errors={{ x: 'should not render' }} notifications={notifications} />)
    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByText('Record saved successfully')).toBeInTheDocument()
    expect(screen.queryByText('should not render')).not.toBeInTheDocument()
    // Missing kind/title fall back to error defaults
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(document.querySelector('.cds--inline-notification--success')).toBeInTheDocument()
    expect(document.querySelector('.cds--inline-notification--error')).toBeInTheDocument()
  })

  it('calls onDismiss with the notification key when closed', () => {
    const onDismiss = vi.fn()
    render(<PageNotifications errors={{ row9: 'Dismissable' }} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledWith('row9')
  })

  it('does not crash when closed without an onDismiss handler', () => {
    const { container } = render(<PageNotifications errors={{ row1: 'No handler' }} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    // Carbon's InlineNotification removes itself; the stable container remains
    expect(container.querySelector('.isp-page-notifications')).toBeInTheDocument()
  })
})
