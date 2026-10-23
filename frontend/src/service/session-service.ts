import type { SessionUser } from '@/interfaces/SessionUser'
import { apiGetJson } from '@/service/api-service'

export const fetchSessionUser = (): Promise<SessionUser> => apiGetJson<SessionUser>('/session/me')

export const fetchApiStatus = (): Promise<{ status: string }> =>
  apiGetJson<{ status: string }>('/status')
