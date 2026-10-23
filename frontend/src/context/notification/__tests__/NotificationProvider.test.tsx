import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import React from 'react'
import { NotificationProvider } from '@/context/notification/NotificationProvider'
import { useNotifications } from '@/context/notification/useNotifications'

const Consumer: React.FC = () => {
  const { toasts, notifySuccess, notifyError, notifyWarning, notifyInfo, dismissToast } =
    useNotifications()
  return (
    <div>
      <ul data-testid="toasts">
        {toasts.map((toast) => (
          <li key={toast.id} data-testid="toast">
            {toast.id}|{toast.kind}|{toast.title}|{toast.subtitle ?? ''}
            <button onClick={() => dismissToast(toast.id)}>dismiss-{toast.id}</button>
          </li>
        ))}
      </ul>
      <button onClick={() => notifySuccess('Saved', 'Row saved')}>success</button>
      <button onClick={() => notifyError('Failed')}>error</button>
      <button onClick={() => notifyWarning('Careful')}>warning</button>
      <button onClick={() => notifyInfo('FYI')}>info</button>
    </div>
  )
}

const renderConsumer = () =>
  render(
    <NotificationProvider>
      <Consumer />
    </NotificationProvider>,
  )

describe('NotificationContext', () => {
  it('starts with no toasts', () => {
    renderConsumer()
    expect(screen.queryAllByTestId('toast')).toHaveLength(0)
  })

  it('pushes toasts of each kind with unique ids', () => {
    renderConsumer()
    fireEvent.click(screen.getByText('success'))
    fireEvent.click(screen.getByText('error'))
    fireEvent.click(screen.getByText('warning'))
    fireEvent.click(screen.getByText('info'))

    const toasts = screen.getAllByTestId('toast')
    expect(toasts).toHaveLength(4)
    expect(toasts[0]).toHaveTextContent('success|Saved|Row saved')
    expect(toasts[1]).toHaveTextContent('error|Failed')
    expect(toasts[2]).toHaveTextContent('warning|Careful')
    expect(toasts[3]).toHaveTextContent('info|FYI')

    const ids = toasts.map((t) => t.textContent?.split('|')[0])
    expect(new Set(ids).size).toBe(4)
  })

  it('caps the stack at 4 toasts, dropping the oldest', () => {
    renderConsumer()
    fireEvent.click(screen.getByText('success'))
    fireEvent.click(screen.getByText('error'))
    fireEvent.click(screen.getByText('warning'))
    fireEvent.click(screen.getByText('info'))
    fireEvent.click(screen.getByText('success'))

    const toasts = screen.getAllByTestId('toast')
    expect(toasts).toHaveLength(4)
    // The first toast (Saved) was dropped; the list now starts with Failed.
    expect(toasts[0]).toHaveTextContent('Failed')
    expect(toasts[3]).toHaveTextContent('Saved')
  })

  it('dismisses a toast by id', () => {
    renderConsumer()
    fireEvent.click(screen.getByText('success'))
    fireEvent.click(screen.getByText('error'))

    const first = screen.getAllByTestId('toast')[0]
    const dismissButton = within(first).getByRole('button')
    fireEvent.click(dismissButton)

    const remaining = screen.getAllByTestId('toast')
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toHaveTextContent('Failed')
  })

  it('useNotifications throws when used outside a NotificationProvider', () => {
    expect(() => render(<Consumer />)).toThrow(
      'useNotifications must be used within a NotificationProvider',
    )
  })
})
