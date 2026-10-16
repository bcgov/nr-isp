import type { SessionUser } from '@/interfaces/SessionUser'

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'error'

export type AuthContextType = {
  status: AuthStatus
  user: SessionUser | null
  isConfigured: boolean
  hasAnyRole: boolean
  isAdmin: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  /** Reloads the session after a failed load, for example when the API was briefly unavailable. */
  refresh: () => Promise<void>
}
