import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import { approver, authValue, renderWithProviders } from '@/__tests__/test-utils'

const renderLayout = (
  auth = authValue({ status: 'signed-in', user: approver, hasAnyRole: true }),
) =>
  renderWithProviders(
    <Routes>
      <Route element={<Layout />}>
        <Route path="*" element={<p>page</p>} />
      </Route>
    </Routes>,
    { auth, path: '/mills' },
  )

describe('Layout', () => {
  it('shows the signed-in user and logs out', async () => {
    const auth = authValue({ status: 'signed-in', user: approver, hasAnyRole: true })
    renderLayout(auth)

    expect(screen.getByText('Smith, Jane')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(auth.logout).toHaveBeenCalledOnce()
  })

  it('toggles between light and dark themes', async () => {
    renderLayout()

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement).toHaveAttribute('data-carbon-theme', 'g100')
    expect(window.localStorage.getItem('isp.ui.theme')).toBe('g100')

    await userEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(document.documentElement).toHaveAttribute('data-carbon-theme', 'white')
  })

  it('collapses the side navigation', async () => {
    renderLayout()

    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }))

    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })
})
