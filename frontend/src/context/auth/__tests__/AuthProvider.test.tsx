import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/context/auth/AuthProvider'
import { notifySessionExpired } from '@/context/auth/session-events'
import { useAuth } from '@/context/auth/useAuth'
import { ApiError } from '@/service/api-service'
import { getUserManager, restoreOidcUser } from '@/service/oidc-service'
import { fetchSessionUser } from '@/service/session-service'
import { approver } from '@/__tests__/test-utils'

vi.mock('@/service/oidc-service', () => ({
  AUTH_CALLBACK_PATH: '/authCallback',
  endOidcSession: vi.fn(),
  getUserManager: vi.fn(() => ({ removeUser: vi.fn().mockResolvedValue(undefined) })),
  isOidcConfigured: vi.fn(() => true),
  restoreOidcUser: vi.fn(),
  startOidcLogin: vi.fn(),
}))
vi.mock('@/service/session-service', () => ({ fetchSessionUser: vi.fn() }))

const Probe = () => {
  const { status, hasAnyRole, isAdmin, user, refresh } = useAuth()
  return (
    <>
      <p>status:{status}</p>
      <p>roles:{String(hasAnyRole)}</p>
      <p>admin:{String(isAdmin)}</p>
      <p>user:{user?.username ?? 'none'}</p>
      <button onClick={() => void refresh()}>refresh</button>
    </>
  )
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.mocked(restoreOidcUser).mockResolvedValue({ access_token: 'token' } as never)
    vi.mocked(fetchSessionUser).mockResolvedValue(approver)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('is signed out without a stored SSO session', async () => {
    vi.mocked(restoreOidcUser).mockResolvedValue(null)
    renderProvider()
    expect(await screen.findByText('status:signed-out')).toBeInTheDocument()
    expect(fetchSessionUser).not.toHaveBeenCalled()
  })

  it('loads the ISP session for a stored SSO session', async () => {
    renderProvider()
    expect(await screen.findByText('status:signed-in')).toBeInTheDocument()
    expect(screen.getByText('user:JSMITH')).toBeInTheDocument()
    expect(screen.getByText('roles:true')).toBeInTheDocument()
    expect(screen.getByText('admin:false')).toBeInTheDocument()
  })

  it('treats an API 401 as signed out and other failures as an error', async () => {
    vi.mocked(fetchSessionUser).mockRejectedValueOnce(new ApiError(401, 'unauthorized'))
    const { unmount } = renderProvider()
    expect(await screen.findByText('status:signed-out')).toBeInTheDocument()
    unmount()

    vi.mocked(fetchSessionUser).mockRejectedValueOnce(new ApiError(503, 'unavailable'))
    renderProvider()
    expect(await screen.findByText('status:error')).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'refresh' }).click())
    expect(await screen.findByText('status:signed-in')).toBeInTheDocument()
  })

  it('signs out when the session expires', async () => {
    renderProvider()
    expect(await screen.findByText('status:signed-in')).toBeInTheDocument()

    act(() => notifySessionExpired())

    await waitFor(() => expect(screen.getByText('status:signed-out')).toBeInTheDocument())
    expect(getUserManager).toHaveBeenCalled()
  })
})
