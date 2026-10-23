import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import ToastRegion from '@/components/common/ToastRegion/ToastRegion'
import { NotificationProvider } from '@/context/notification/NotificationProvider'
import { useNotifications } from '@/context/notification/useNotifications'

const Trigger: React.FC = () => {
  const { notifySuccess, notifyError } = useNotifications()
  return (
    <div>
      <button onClick={() => notifySuccess('Mill added', 'The mill was saved')}>
        push-success
      </button>
      <button onClick={() => notifyError('Save failed')}>push-error</button>
    </div>
  )
}

const renderRegion = () =>
  render(
    <NotificationProvider>
      <Trigger />
      <ToastRegion />
    </NotificationProvider>,
  )

describe('ToastRegion', () => {
  it('renders nothing when there are no toasts', () => {
    renderRegion()
    expect(document.querySelector('.isp-toast-region')).toBeNull()
  })

  it('renders queued toasts with title, subtitle, and kind', () => {
    renderRegion()
    fireEvent.click(screen.getByText('push-success'))
    fireEvent.click(screen.getByText('push-error'))

    expect(screen.getByText('Mill added')).toBeInTheDocument()
    expect(screen.getByText('The mill was saved')).toBeInTheDocument()
    expect(screen.getByText('Save failed')).toBeInTheDocument()
    expect(document.querySelectorAll('.isp-toast-region__toast')).toHaveLength(2)
  })

  it('dismisses a toast via its close button', () => {
    renderRegion()
    fireEvent.click(screen.getByText('push-success'))
    expect(screen.getByText('Mill added')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByText('Mill added')).not.toBeInTheDocument()
    expect(document.querySelector('.isp-toast-region')).toBeNull()
  })
})
