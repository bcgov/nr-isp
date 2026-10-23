import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_EXPIRED_EVENT } from '@/context/auth/session-events'
import { ApiError, apiFetch, apiGetJson } from '@/service/api-service'
import { getOidcUser, isSessionEnded } from '@/service/oidc-service'

vi.mock('@/service/oidc-service', () => ({
  getOidcUser: vi.fn(),
  isSessionEnded: vi.fn(),
}))

const fetchMock = vi.fn<typeof fetch>()

const requestHeaders = (call: number) => new Headers(fetchMock.mock.calls[call][1]?.headers)

describe('api-service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(getOidcUser).mockResolvedValue({ access_token: 'token-1' } as never)
    vi.mocked(isSessionEnded).mockReturnValue(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('sends the bearer token to the API base path', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))

    await apiFetch('/mills', { method: 'POST' })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/mills')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST')
    expect(requestHeaders(0).get('Authorization')).toBe('Bearer token-1')
    expect(requestHeaders(0).get('Accept')).toBe('application/json')
  })

  it('retries a 401 once with a forced token refresh', async () => {
    vi.mocked(getOidcUser)
      .mockResolvedValueOnce({ access_token: 'stale' } as never)
      .mockResolvedValueOnce({ access_token: 'fresh' } as never)
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))

    const response = await apiFetch('/session/me')

    expect(response.status).toBe(200)
    expect(getOidcUser).toHaveBeenLastCalledWith({ forceRefresh: true })
    expect(requestHeaders(1).get('Authorization')).toBe('Bearer fresh')
  })

  it('announces an ended session and sends the request without a token', async () => {
    const onExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    vi.mocked(getOidcUser).mockRejectedValue(new Error('invalid_grant'))
    vi.mocked(isSessionEnded).mockReturnValue(true)
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))

    await apiFetch('/status')

    expect(onExpired).toHaveBeenCalledOnce()
    expect(requestHeaders(0).has('Authorization')).toBe(false)
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  })

  it('parses JSON and reports failed requests', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"status":"UP"}', { status: 200 }))
    await expect(apiGetJson('/status')).resolves.toEqual({ status: 'UP' })

    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }))
    const failure = apiGetJson('/status')
    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toMatchObject({ status: 503 })
  })
})
