import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/service/api-service'
import {
  deleteMill,
  exportMills,
  getIspSellPriceZoneCodes,
  getMills,
  saveMill,
} from '@/service/mills-service'
import { getOidcUser } from '@/service/oidc-service'

vi.mock('@/service/oidc-service', () => ({
  getOidcUser: vi.fn(),
  isSessionEnded: vi.fn(),
}))

const fetchMock = vi.fn<typeof fetch>()

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } })

describe('mills-service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(getOidcUser).mockResolvedValue({ access_token: 'token-1' } as never)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('reads mills and sell price zones', async () => {
    fetchMock.mockResolvedValueOnce(json([{ millNumber: 100, millName: 'Alpha' }]))
    fetchMock.mockResolvedValueOnce(json([{ ispSellPriceZoneCode: '01', description: 'Coast' }]))

    await expect(getMills()).resolves.toEqual([{ millNumber: 100, millName: 'Alpha' }])
    await expect(getIspSellPriceZoneCodes()).resolves.toEqual([
      { ispSellPriceZoneCode: '01', description: 'Coast' },
    ])
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/mills',
      '/api/isp-sell-price-zone-codes',
    ])
  })

  it('posts a mill as JSON and returns the saved row', async () => {
    fetchMock.mockResolvedValueOnce(json({ millId: 1, millNumber: 100, millName: 'Alpha' }, 201))

    await expect(saveMill({ millNumber: 100, millName: 'Alpha' })).resolves.toMatchObject({
      millId: 1,
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/mills')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init?.body as string)).toEqual({ millNumber: 100, millName: 'Alpha' })
  })

  it('reports why the API rejected a mill', async () => {
    fetchMock.mockResolvedValueOnce(
      text('Invalid Client Location Code: 99 for Client Number 00012345 does not exist.', 400),
    )

    const failure = saveMill({ millNumber: 100, millName: 'Alpha' })

    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toMatchObject({
      status: 400,
      message: 'Invalid Client Location Code: 99 for Client Number 00012345 does not exist.',
    })
  })

  it('falls back to a generic message for server errors', async () => {
    fetchMock.mockResolvedValueOnce(json({ status: 500, error: 'Internal Server Error' }, 500))

    await expect(saveMill({ millNumber: 100, millName: 'Alpha' })).rejects.toMatchObject({
      message: 'Failed to save mill. (HTTP 500)',
    })
  })

  it('deletes a mill by ID', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    fetchMock.mockResolvedValueOnce(text('ORA-02292: child record found', 400))
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }))

    await expect(deleteMill(7)).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/mills/7')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE')
    await expect(deleteMill(7)).rejects.toMatchObject({ message: 'ORA-02292: child record found' })
    await expect(deleteMill(8)).rejects.toMatchObject({
      message: 'Failed to delete mill. (HTTP 404)',
    })
  })

  describe('exportMills', () => {
    const createObjectURL = vi.fn(() => 'blob:mills')
    const revokeObjectURL = vi.fn()

    beforeEach(() => {
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    })

    it('downloads the export with the bearer token', async () => {
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      fetchMock.mockResolvedValueOnce(new Response('Mill Number\n', { status: 200 }))

      await exportMills('csv')

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/mills/export/csv')
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-1')
      expect(new Headers(init?.headers).get('Accept')).toBe('*/*')
      expect(click).toHaveBeenCalledOnce()
      const link = click.mock.contexts[0] as HTMLAnchorElement
      expect(link.download).toBe('mills.csv')
      expect(link.isConnected).toBe(false)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mills')
      click.mockRestore()
    })

    it('fails without downloading when the export fails', async () => {
      fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }))

      await expect(exportMills('pdf')).rejects.toMatchObject({ status: 503 })
      expect(createObjectURL).not.toHaveBeenCalled()
    })
  })
})
