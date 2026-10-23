import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { AuthContext } from '@/context/auth/AuthContext'
import ThemeProvider from '@/context/theme/ThemeProvider'
import AuthCallback from '@/pages/AuthCallback'
import Home from '@/pages/Home'
import NoAccess from '@/pages/NoAccess'
import SessionError from '@/pages/SessionError'
import { completeOidcLogin } from '@/service/oidc-service'
import { fetchApiStatus, fetchSessionUser } from '@/service/session-service'
import { apiGetJson } from '@/service/api-service'
import type * as ApiService from '@/service/api-service'
import type * as OidcService from '@/service/oidc-service'
import { approver, authValue, renderWithProviders } from '@/__tests__/test-utils'

vi.mock('@/service/oidc-service', async (importOriginal) => ({
  ...(await importOriginal<typeof OidcService>()),
  completeOidcLogin: vi.fn(),
}))
vi.mock('@/service/api-service', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiService>()),
  apiGetJson: vi.fn(),
}))

const replace = vi.fn()

describe('pages', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('returns to the saved destination after login', async () => {
    vi.stubGlobal('location', { ...window.location, replace })
    window.sessionStorage.setItem('isp.login-destination', '/isp-inbox')
    vi.mocked(completeOidcLogin).mockResolvedValue({} as never)

    renderWithProviders(<AuthCallback />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/isp-inbox'))
    expect(window.sessionStorage.getItem('isp.login-destination')).toBeNull()
  })

  it('returns home when the login cannot complete', async () => {
    vi.stubGlobal('location', { ...window.location, replace })
    window.sessionStorage.setItem('isp.login-destination', '/isp-inbox')
    vi.mocked(completeOidcLogin).mockRejectedValue(new Error('spent code'))

    renderWithProviders(<AuthCallback />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'))
    expect(window.sessionStorage.getItem('isp.login-destination')).toBeNull()
  })

  it('reports an unavailable API on the home page', async () => {
    vi.mocked(apiGetJson).mockRejectedValue(new Error('down'))
    renderWithProviders(<Home />, { auth: authValue({ status: 'signed-in', user: approver }) })

    expect(await screen.findByText('Unavailable')).toBeInTheDocument()
  })

  it('reads the session and API status from the backend', async () => {
    vi.mocked(apiGetJson).mockResolvedValue({ status: 'UP' })

    await fetchApiStatus()
    await fetchSessionUser()

    expect(apiGetJson).toHaveBeenCalledWith('/status')
    expect(apiGetJson).toHaveBeenCalledWith('/session/me')
  })

  it.each([
    ['no access', <NoAccess key="no-access" />],
    ['session error', <SessionError key="error" />],
  ])('logs out from the %s page', async (_name, page) => {
    const auth = authValue({ status: 'signed-in', user: approver })
    renderWithProviders(page, { auth })

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(auth.logout).toHaveBeenCalledOnce()
  })

  it('mounts the router', () => {
    render(
      <AuthContext value={authValue()}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthContext>,
    )
    expect(screen.getByRole('button', { name: /log in with idir/i })).toBeInTheDocument()
  })
})
