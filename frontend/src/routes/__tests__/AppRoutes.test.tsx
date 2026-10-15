import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { approver, authValue, renderWithProviders } from '@/__tests__/test-utils'
import AppRoutes from '@/routes/AppRoutes'

vi.mock('@/service/session-service', () => ({
  fetchApiStatus: vi.fn().mockResolvedValue({ status: 'UP' }),
}))
vi.mock('@/service/mills-service', () => ({
  getMills: vi.fn().mockResolvedValue([]),
  getIspSellPriceZoneCodes: vi.fn().mockResolvedValue([]),
}))

const signedIn = authValue({ status: 'signed-in', user: approver, hasAnyRole: true })

describe('AppRoutes', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('waits for the session to load', () => {
    renderWithProviders(<AppRoutes />, { auth: authValue({ status: 'loading' }) })
    expect(screen.getByText('Loading session…')).toBeInTheDocument()
  })

  it('shows the login page to signed-out visitors', () => {
    renderWithProviders(<AppRoutes />)
    expect(screen.getByRole('heading', { level: 1, name: 'ISP' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in with idir/i })).toBeEnabled()
  })

  it('keeps a known deep link as the post-login destination', async () => {
    const auth = authValue()
    renderWithProviders(<AppRoutes />, { auth, path: '/sales-summary/123?tab=lumber' })

    await userEvent.click(screen.getByRole('button', { name: /log in with idir/i }))

    expect(auth.login).toHaveBeenCalledOnce()
    expect(window.sessionStorage.getItem('isp.login-destination')).toBe(
      '/sales-summary/123?tab=lumber',
    )
  })

  it('shows not found for unknown signed-out paths', () => {
    renderWithProviders(<AppRoutes />, { path: '/nope' })
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument()
  })

  it('tells signed-in users without an ISP role that they have no access', () => {
    renderWithProviders(<AppRoutes />, {
      auth: authValue({ status: 'signed-in', user: { ...approver, roles: [] } }),
      path: '/mills',
    })
    expect(screen.getByRole('heading', { name: 'No ISP access' })).toBeInTheDocument()
  })

  it('offers a retry when the session could not be loaded', async () => {
    const auth = authValue({ status: 'error' })
    renderWithProviders(<AppRoutes />, { auth })

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(auth.refresh).toHaveBeenCalledOnce()
  })

  it('shows the home page with the ISP navigation', async () => {
    renderWithProviders(<AppRoutes />, { auth: signedIn })

    expect(screen.getByRole('heading', { name: 'Welcome, Smith, Jane' })).toBeInTheDocument()
    expect(screen.getByText('Approver')).toBeInTheDocument()
    expect(await screen.findByText('Available')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inbox' })).toHaveAttribute('href', '/isp-inbox')
    expect(screen.getByRole('link', { name: 'R13 - Ad hoc' })).toHaveAttribute(
      'href',
      '/r13-report',
    )
  })

  it('serves ISP paths, including sub-paths, with placeholders until they are ported', () => {
    renderWithProviders(<AppRoutes />, { auth: signedIn, path: '/sales-summary/42' })
    expect(screen.getByRole('heading', { name: 'Sales summary' })).toBeInTheDocument()
    expect(screen.getByText(/not been ported/)).toBeInTheDocument()
  })

  it('serves ported pages in place of their placeholders', async () => {
    renderWithProviders(<AppRoutes />, { auth: signedIn, path: '/mills' })
    expect(await screen.findByRole('heading', { name: 'Mill Table' })).toBeInTheDocument()
    expect(screen.queryByText(/not been ported/)).not.toBeInTheDocument()
  })

  it('shows not found inside the layout for unknown signed-in paths', async () => {
    renderWithProviders(<AppRoutes />, { auth: signedIn, path: '/nope' })
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Back home' }))

    expect(screen.getByRole('heading', { name: 'Welcome, Smith, Jane' })).toBeInTheDocument()
  })
})
