import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Landing from '@/pages/Landing'
import { authValue, renderWithProviders } from '@/__tests__/test-utils'

describe('Landing', () => {
  it('reports a login that could not start', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const auth = authValue({ login: vi.fn().mockRejectedValue(new Error('boom')) })
    renderWithProviders(<Landing loginDestination="/mills" />, { auth })

    await userEvent.click(screen.getByRole('button', { name: /log in with idir/i }))

    expect(await screen.findByText('Unable to start the login flow.')).toBeInTheDocument()
    expect(window.sessionStorage.getItem('isp.login-destination')).toBeNull()
  })

  it('disables login when SSO is not configured', () => {
    renderWithProviders(<Landing />, { auth: authValue({ isConfigured: false }) })

    expect(screen.getByRole('button', { name: /log in with idir/i })).toBeDisabled()
    expect(screen.getByText(/not configured for this environment/)).toBeInTheDocument()
  })
})
