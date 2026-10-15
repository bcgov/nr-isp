import { notifySessionExpired } from '@/context/auth/session-events'
import { getOidcUser, isSessionEnded } from '@/service/oidc-service'

export const API_BASE = '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const accessToken = async (forceRefresh: boolean): Promise<string | undefined> => {
  try {
    return (await getOidcUser({ forceRefresh }))?.access_token
  } catch (error) {
    if (isSessionEnded(error)) notifySessionExpired()
    return undefined
  }
}

/**
 * fetch() against the ISP API with the user's bearer token. A 401 gets one forced token refresh
 * and retry, as the CGI rebuild's authFetch did; the backend remains the authorization boundary.
 */
export const apiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const send = async (forceRefresh: boolean): Promise<Response> => {
    const headers = new Headers(init.headers)
    if (!headers.has('Accept')) headers.set('Accept', 'application/json')
    const token = await accessToken(forceRefresh)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(`${API_BASE}${path}`, { ...init, headers })
  }

  const response = await send(false)
  return response.status === 401 ? send(true) : response
}

export const apiGetJson = async <T>(path: string): Promise<T> => {
  const response = await apiFetch(path)
  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

/**
 * The message for a failed response. The API returns rejected input (validation, business rules,
 * database constraints) as plain text for the page to show as-is; any other failure carries
 * Spring Boot's JSON error body, which is not meant for users, so it gets the caller's fallback.
 */
export const readErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  if (response.headers.get('Content-Type')?.startsWith('text/plain')) {
    const text = (await response.text()).trim()
    if (text) return text
  }
  return `${fallback} (HTTP ${response.status})`
}

/**
 * Downloads a file from the API. A plain link cannot send the bearer token, so the file is fetched
 * and handed to the browser as an object URL, as the CGI rebuild's exports did.
 */
export const apiDownload = async (path: string, fileName: string): Promise<void> => {
  const response = await apiFetch(path, { headers: { Accept: '*/*' } })
  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with HTTP ${response.status}`)
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
