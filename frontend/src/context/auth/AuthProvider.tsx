import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from '@/context/auth/AuthContext'
import { SESSION_EXPIRED_EVENT } from '@/context/auth/session-events'
import type { AuthContextType, AuthStatus } from '@/context/auth/types'
import type { SessionUser } from '@/interfaces/SessionUser'
import { ApiError } from '@/service/api-service'
import {
  AUTH_CALLBACK_PATH,
  endOidcSession,
  getUserManager,
  isOidcConfigured,
  restoreOidcUser,
  startOidcLogin,
} from '@/service/oidc-service'
import { fetchSessionUser } from '@/service/session-service'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const isCallback = window.location.pathname === AUTH_CALLBACK_PATH
  const [status, setStatus] = useState<AuthStatus>(isCallback ? 'signed-out' : 'loading')
  const [user, setUser] = useState<SessionUser | null>(null)

  const loadSession = useCallback(async () => {
    const oidcUser = await restoreOidcUser()
    if (!oidcUser) {
      setUser(null)
      setStatus('signed-out')
      return
    }
    try {
      setUser(await fetchSessionUser())
      setStatus('signed-in')
    } catch (error) {
      setUser(null)
      // The API rejected the token even after a refresh: treat the session as over.
      setStatus(error instanceof ApiError && error.status === 401 ? 'signed-out' : 'error')
    }
  }, [])

  useEffect(() => {
    // The callback page finishes the code exchange, then reloads the app.
    if (!isCallback) void loadSession()
  }, [isCallback, loadSession])

  useEffect(() => {
    const onExpired = () => {
      void getUserManager()
        .removeUser()
        .catch(() => undefined)
      setUser(null)
      setStatus('signed-out')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  const refresh = useCallback(async () => {
    setStatus('loading')
    await loadSession()
  }, [loadSession])

  const value = useMemo<AuthContextType>(() => {
    const roles = user?.roles ?? []
    return {
      status,
      user,
      isConfigured: isOidcConfigured(),
      hasAnyRole: roles.length > 0,
      isAdmin: roles.includes('ISP_ADMIN'),
      login: startOidcLogin,
      logout: () => endOidcSession(),
      refresh,
    }
  }, [refresh, status, user])

  return <AuthContext value={value}>{children}</AuthContext>
}
