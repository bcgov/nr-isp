import { afterEach, describe, expect, it, vi } from 'vitest'

const loadService = async () => {
  vi.resetModules()
  return import('@/service/oidc-service')
}

describe('oidc-service', () => {
  afterEach(() => {
    window.config = {}
  })

  it('is configured only with an issuer and client ID', async () => {
    window.config = { VITE_OIDC_ISSUER_URI: 'https://sso.example/realms/standard' }
    const service = await loadService()
    expect(service.isOidcConfigured()).toBe(false)

    window.config.VITE_OIDC_CLIENT_ID = 'isp-client'
    expect(service.isOidcConfigured()).toBe(true)
  })

  it('returns no user when login is not configured', async () => {
    window.config = {}
    const service = await loadService()
    await expect(service.getOidcUser()).resolves.toBeNull()
    await expect(service.startOidcLogin()).rejects.toThrow('not configured')
  })

  it('builds the Keycloak end-session URL from the configured realm', async () => {
    window.config = {
      VITE_OIDC_ISSUER_URI: 'https://sso.example/realms/standard/',
      VITE_OIDC_CLIENT_ID: 'isp-client',
    }
    const service = await loadService()
    const url = new URL(service.buildEndSessionUrl('id-token'))

    expect(`${url.origin}${url.pathname}`).toBe(
      'https://sso.example/realms/standard/protocol/openid-connect/logout',
    )
    expect(url.searchParams.get('client_id')).toBe('isp-client')
    expect(url.searchParams.get('id_token_hint')).toBe('id-token')
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(window.location.origin)
  })

  it('removes the stored user and leaves for SSO on logout', async () => {
    window.config = {
      VITE_OIDC_ISSUER_URI: 'https://sso.example/realms/standard',
      VITE_OIDC_CLIENT_ID: 'isp-client',
    }
    const service = await loadService()
    const manager = service.getUserManager()
    vi.spyOn(manager, 'getUser').mockResolvedValue(null)
    const removeUser = vi.spyOn(manager, 'removeUser').mockResolvedValue()
    const navigate = vi.fn()

    await service.endOidcSession(navigate)

    expect(removeUser).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith(
      expect.stringContaining('/protocol/openid-connect/logout'),
    )
    await expect(service.getOidcUser()).resolves.toBeNull()
  })
})
