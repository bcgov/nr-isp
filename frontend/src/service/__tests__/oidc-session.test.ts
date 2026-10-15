import { ErrorResponse } from 'oidc-client-ts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const configure = () => {
  window.config = {
    VITE_OIDC_ISSUER_URI: 'https://sso.example/realms/standard',
    VITE_OIDC_CLIENT_ID: 'isp-client',
  }
}

const loadService = async () => {
  vi.resetModules()
  configure()
  const service = await import('@/service/oidc-service')
  return { service, manager: service.getUserManager() }
}

const storedUser = (overrides: Record<string, unknown> = {}) =>
  ({ access_token: 'stored', refresh_token: 'refresh', expires_in: 300, ...overrides }) as never

describe('oidc-service sessions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a stored token that is not about to expire', async () => {
    const { service, manager } = await loadService()
    vi.spyOn(manager, 'getUser').mockResolvedValue(storedUser())
    const signinSilent = vi.spyOn(manager, 'signinSilent')

    await expect(service.getOidcUser()).resolves.toMatchObject({ access_token: 'stored' })
    expect(signinSilent).not.toHaveBeenCalled()
  })

  it('shares one refresh between concurrent callers when the token is expiring', async () => {
    const { service, manager } = await loadService()
    vi.spyOn(manager, 'getUser').mockResolvedValue(storedUser({ expires_in: 30 }))
    const signinSilent = vi
      .spyOn(manager, 'signinSilent')
      .mockResolvedValue(storedUser({ access_token: 'fresh' }))

    const [first, second] = await Promise.all([
      service.getOidcUser(),
      service.getOidcUser({ forceRefresh: true }),
    ])

    expect(first).toMatchObject({ access_token: 'fresh' })
    expect(second).toMatchObject({ access_token: 'fresh' })
    expect(signinSilent).toHaveBeenCalledOnce()
  })

  it('ends a session that has no refresh token', async () => {
    const { service, manager } = await loadService()
    vi.spyOn(manager, 'getUser').mockResolvedValue(storedUser({ refresh_token: undefined }))

    const failure = service.getOidcUser({ forceRefresh: true })

    await expect(failure).rejects.toThrow('cannot be renewed')
    await failure.catch((error) => expect(service.isSessionEnded(error)).toBe(true))
  })

  it('discards a session whose refresh token SSO rejects', async () => {
    const { service, manager } = await loadService()
    vi.spyOn(manager, 'getUser').mockResolvedValue(storedUser({ expires_in: 0 }))
    vi.spyOn(manager, 'signinSilent').mockRejectedValue(
      new ErrorResponse({ error: 'invalid_grant' }),
    )
    const removeUser = vi.spyOn(manager, 'removeUser').mockResolvedValue()

    await expect(service.restoreOidcUser()).resolves.toBeNull()
    expect(removeUser).toHaveBeenCalledOnce()
  })

  it('keeps a session after a temporary SSO failure', async () => {
    const { service, manager } = await loadService()
    vi.spyOn(manager, 'getUser').mockResolvedValue(storedUser({ expires_in: 0 }))
    vi.spyOn(manager, 'signinSilent').mockRejectedValue(new Error('network'))
    const removeUser = vi.spyOn(manager, 'removeUser').mockResolvedValue()

    await expect(service.restoreOidcUser()).resolves.toBeNull()
    expect(removeUser).not.toHaveBeenCalled()
  })

  it('signs in through IDIR', async () => {
    const { service, manager } = await loadService()
    const signinRedirect = vi.spyOn(manager, 'signinRedirect').mockResolvedValue()

    await service.startOidcLogin()

    expect(signinRedirect).toHaveBeenCalledWith({
      extraQueryParams: { kc_idp_hint: 'azureidir' },
    })
  })

  it('exchanges the authorization code only once', async () => {
    const { service, manager } = await loadService()
    const callback = vi
      .spyOn(manager, 'signinRedirectCallback')
      .mockResolvedValue(storedUser({ access_token: 'new' }))

    const [first, second] = await Promise.all([
      service.completeOidcLogin(),
      service.completeOidcLogin(),
    ])

    expect(first).toBe(second)
    expect(callback).toHaveBeenCalledOnce()
  })
})
